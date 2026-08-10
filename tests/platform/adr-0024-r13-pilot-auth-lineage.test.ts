import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES,
  type LineageAttestation
} from '../../lib/lineage-attestation';
import { verifyStrictLedger } from '../../lib/lineage-verifier';
import {
  RepositoryMigrationExactSuccessError,
  assertExactSuccessfulRepositoryMigration,
  normaliseMigrationRecord,
  verifyAttestedLedger,
  type MigrationLedgerRow
} from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;
const checksumEvidence = JSON.parse(
  readFileSync(
    'docs/03-engineering/evidence/ADR_0024_R13_CHECKSUM_DIVERGENCE.json',
    'utf8'
  )
) as Record<string, unknown>;
const lifecycleEvidence = JSON.parse(
  readFileSync(
    'docs/03-engineering/evidence/ADR_0024_R13_ZERO_STEP_LIFECYCLE_INVESTIGATION.json',
    'utf8'
  )
) as Record<string, unknown>;

const migrationName = '20260716183000_pilot_installer_auth';
const recordId = '69505647-7711-408c-853e-32579345d1b0';
const canonicalChecksum = 'd35cb01bfaeea27b02a4a1361a4f05688e730592e3cd1731ed23911871ca81fb';
const observedChecksum = 'fee0749e78b3ecc7aea1f6823b338a16c0ed5fb8e4613e079042bb52192913a9';
const pilotMigration = manifest.migrations.find((migration) => migration.name === migrationName)!;

function sha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function row(
  input: Partial<MigrationLedgerRow> &
    Pick<MigrationLedgerRow, 'id' | 'migration_name' | 'checksum'>
): MigrationLedgerRow {
  return {
    started_at: '2026-01-01T00:00:00.000Z',
    finished_at: '2026-01-01T00:00:00.001Z',
    applied_steps_count: 1,
    rolled_back_at: null,
    logs: null,
    ...input
  };
}

function r13Row(overrides: Partial<MigrationLedgerRow> = {}) {
  return row({
    id: recordId,
    migration_name: migrationName,
    checksum: observedChecksum,
    applied_steps_count: 0,
    ...overrides
  });
}

function productionFixture() {
  const attestation = structuredClone(pending);
  const rows = manifest.migrations
    .filter(
      (migration) =>
        migration.name !== attestation.relatedMigration.name &&
        migration.name !== '20260724180000_password_reset_foundation'
    )
    .map((migration, index) => {
      const divergence = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
        (candidate) => candidate.migrationName === migration.name
      );
      return row({
        id:
          migration.name === migrationName
            ? recordId
            : divergence?.recordId ??
              `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
        migration_name: migration.name,
        checksum:
          migration.name === migrationName
            ? observedChecksum
            : divergence?.observedProductionChecksum ?? migration.checksum,
        applied_steps_count: migration.name === migrationName ? 0 : 1,
        started_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        finished_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.001Z`
      });
    });
  const failedLog = 'synthetic duplicate-column failure';
  attestation.relatedMigration.failedRecord.id = '11111111-1111-4111-8111-111111111111';
  attestation.relatedMigration.failedRecord.logsDigest = sha256(failedLog);
  attestation.relatedMigration.completedZeroStepRecord.id =
    '22222222-2222-4222-8222-222222222222';
  rows.push(
    row({
      id: attestation.missingMigration.id!,
      migration_name: attestation.missingMigration.migrationName,
      checksum: attestation.missingMigration.checksum,
      started_at: attestation.missingMigration.startedAt,
      finished_at: attestation.missingMigration.finishedAt
    }),
    row({
      id: attestation.relatedMigration.failedRecord.id,
      migration_name: attestation.relatedMigration.name,
      checksum: attestation.relatedMigration.repositoryChecksum,
      started_at: attestation.relatedMigration.failedRecord.startedAt,
      finished_at: null,
      applied_steps_count: 0,
      rolled_back_at: attestation.relatedMigration.failedRecord.rolledBackAt,
      logs: failedLog
    }),
    row({
      id: attestation.relatedMigration.completedZeroStepRecord.id,
      migration_name: attestation.relatedMigration.name,
      checksum: attestation.relatedMigration.repositoryChecksum,
      started_at: attestation.relatedMigration.completedZeroStepRecord.startedAt,
      finished_at: attestation.relatedMigration.completedZeroStepRecord.finishedAt,
      applied_steps_count: 0
    })
  );
  return { rows, attestation, manifest: structuredClone(manifest) };
}

function verifyProductionFixture(fixture = productionFixture()) {
  return verifyAttestedLedger({
    rows: fixture.rows,
    manifest: fixture.manifest,
    attestation: fixture.attestation,
    mode: 'production-status',
    approvedPendingMigrations: ['20260724180000_password_reset_foundation']
  });
}

test('pilot auth committed bytes and immutable manifest remain canonical', () => {
  const committed = execFileSync('git', ['show', `:${pilotMigration.path}`], {
    encoding: 'buffer'
  });
  assert.deepEqual(
    {
      bytes: committed.length,
      bom: committed.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
      lineFeeds: committed.toString('utf8').match(/\n/g)?.length,
      carriageReturns: committed.toString('utf8').match(/\r/g)?.length ?? 0,
      finalByte: committed.at(-1),
      checksum: sha256(committed),
      manifestChecksum: pilotMigration.checksum
    },
    {
      bytes: 2572,
      bom: false,
      lineFeeds: 81,
      carriageReturns: 0,
      finalByte: 10,
      checksum: canonicalChecksum,
      manifestChecksum: canonicalChecksum
    }
  );
});

test('R13 checksum classification A is exact and reversible', () => {
  const committed = execFileSync('git', ['show', `:${pilotMigration.path}`], {
    encoding: 'buffer'
  });
  const crlf = Buffer.from(committed.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  assert.equal(crlf.length, 2653);
  assert.equal(sha256(crlf), observedChecksum);
  assert.deepEqual(
    Buffer.from(crlf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8'),
    committed
  );
  assert.equal(checksumEvidence.classification, 'A-exact-alternate-byte-representation-proven');
  assert.equal(
    sha256(
      readFileSync(
        'docs/03-engineering/evidence/ADR_0024_R13_CHECKSUM_DIVERGENCE.json'
      )
    ),
    '9134ad417c1fba9ff440af03c1e0853b83eca69aa0b0696f67b538d728532ed8'
  );
  assert.equal(
    sha256(
      readFileSync(
        'docs/03-engineering/evidence/ADR_0024_R13_ZERO_STEP_LIFECYCLE_INVESTIGATION.json'
      )
    ),
    '5f1f11c00fca0df3a0d97cbc1b93b0e333dd65cf2e1ba217c04d334a1352ee4a'
  );
});

test('normal successful migration still requires exactly one applied step', () => {
  const normal = normaliseMigrationRecord(
    r13Row({ checksum: canonicalChecksum, applied_steps_count: 1 })
  );
  assert.doesNotThrow(() => assertExactSuccessfulRepositoryMigration([normal], pilotMigration));

  const zeroStep = normaliseMigrationRecord(
    r13Row({ checksum: canonicalChecksum, applied_steps_count: 0 })
  );
  assert.throws(
    () => assertExactSuccessfulRepositoryMigration([zeroStep], pilotMigration),
    (error: unknown) =>
      error instanceof RepositoryMigrationExactSuccessError &&
      error.report.failures.some((failure) => failure.reason === 'applied-step-count-mismatch')
  );
});

test('checksum classification never bypasses the zero-step lifecycle failure', () => {
  const record = normaliseMigrationRecord(r13Row());
  assert.throws(
    () => assertExactSuccessfulRepositoryMigration([record], pilotMigration),
    (error: unknown) => {
      assert.ok(error instanceof RepositoryMigrationExactSuccessError);
      assert.deepEqual(
        error.report.failures.map((failure) => failure.reason),
        ['checksum-mismatch', 'applied-step-count-mismatch']
      );
      return true;
    }
  );
  assert.equal(
    lifecycleEvidence.classification,
    'L1-zero-step-completed-state-authoritatively-explained-and-safe-historical-operation'
  );
});

test('ordinary one-step tuples remain exact while pilot auth uses a separate pending structure', () => {
  assert.equal(PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.length, 4);
  assert.deepEqual(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.map((entry) => entry.migrationName),
    [
      '20260710120000_identity_organisation_foundation',
      '20260710130000_users_roles_permissions_audit',
      '20260710140000_workflow_foundation',
      '20260718130000_tenant_provisioning_data_model'
    ]
  );
  assert.equal(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (entry) => String(entry.migrationName) === migrationName
    ),
    false
  );
  assert.equal(pending.historicalResolvedMigrations.length, 1);
  assert.equal(
    pending.historicalResolvedMigrations[0].stateName,
    'attestedHistoricalResolvedMigration'
  );
  assert.equal(pending.historicalResolvedMigrations[0].migrationName, migrationName);
  assert.equal(pending.historicalResolvedMigrations[0].recordId, recordId);
  assert.equal(pending.historicalResolvedMigrations[0].repositoryChecksum, canonicalChecksum);
  assert.equal(pending.historicalResolvedMigrations[0].observedProductionChecksum, observedChecksum);
  assert.equal(pending.historicalResolvedMigrations[0].expectedAppliedStepsCount, 0);
  assert.equal(pending.historicalResolvedMigrations[0].observedCurrentSchema.fingerprint, null);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.pilotStageCompensatingControl?.captures.length, 0);
  assert.equal(pending.approvals.length, 0);
});

test('strict Preview remains canonical-only', () => {
  const rows = manifest.migrations.map((migration, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: migration.name,
      checksum: migration.name === migrationName ? observedChecksum : migration.checksum,
      applied_steps_count: migration.name === migrationName ? 0 : 1
    })
  );
  assert.throws(() => verifyStrictLedger(rows, manifest));
});

test('pilot zero-step variants and another zero-step migration all fail closed', () => {
  const variants: MigrationLedgerRow[] = [
    r13Row(),
    r13Row({ id: '33333333-3333-4333-8333-333333333333' }),
    r13Row({ checksum: canonicalChecksum }),
    r13Row({ rolled_back_at: '2026-01-01T00:00:00.002Z' }),
    r13Row({ logs: 'unexpected historical log' })
  ];
  for (const candidate of variants) {
    assert.throws(() =>
      assertExactSuccessfulRepositoryMigration(
        [normaliseMigrationRecord(candidate)],
        pilotMigration
      )
    );
  }

  const other = manifest.migrations.find(
    (migration) =>
      migration.name !== migrationName &&
      !PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
        (divergence) => divergence.migrationName === migration.name
      )
  )!;
  assert.throws(() =>
    assertExactSuccessfulRepositoryMigration(
      [
        normaliseMigrationRecord(
          row({
            id: '44444444-4444-4444-8444-444444444444',
            migration_name: other.name,
            checksum: other.checksum,
            applied_steps_count: 0
          })
        )
      ],
      other
    )
  );
});

test('R13 zero-step and wrong Production fingerprint fail the current attested path', () => {
  const fixture = productionFixture();
  fixture.attestation.approvedDatabaseFingerprint =
    'db_aaaaaaaaaaaaaaaa' as LineageAttestation['approvedDatabaseFingerprint'];
  assert.throws(() => verifyProductionFixture(fixture));

  const exactFingerprint = productionFixture();
  assert.throws(() => verifyProductionFixture(exactFingerprint));
});

test('expected pilot-auth schema inventory is deterministic and grounded in repository SQL', () => {
  const inventory = lifecycleEvidence.schemaInventory as {
    version: string;
    tables: string[];
    columns: string[];
    constraints: string[];
    indexes: string[];
    enumsIntroducedByMigration: string[];
    laterSchemaEvolutionToAccountFor: string[];
  };
  assert.deepEqual(inventory, {
    version: 'adr-0024-pilot-auth-expected-schema-inventory/v1',
    tables: ['AuthSession'],
    columns: [
      'Organisation.slug text not null',
      'Organisation.verified boolean not null default false',
      'User.passwordHash text nullable',
      'User.lastLoginAt timestamp(3) nullable',
      'AuthSession.id text not null',
      'AuthSession.userId text not null',
      'AuthSession.tokenHash text not null',
      'AuthSession.expiresAt timestamp(3) not null',
      'AuthSession.createdAt timestamp(3) not null default CURRENT_TIMESTAMP'
    ],
    constraints: [
      'AuthSession_pkey primary key (id)',
      'User_email_normalised_check check (email = lower(trim(email)))',
      'AuthSession_userId_fkey foreign key (userId) references User(id) on delete cascade on update cascade'
    ],
    indexes: [
      'Organisation_slug_key unique (slug)',
      'OrganisationMembership_userId_key unique (userId)',
      'AuthSession_tokenHash_key unique (tokenHash)',
      'AuthSession_userId_expiresAt_idx (userId, expiresAt)',
      'AuthSession_expiresAt_idx (expiresAt)'
    ],
    enumsIntroducedByMigration: [],
    laterSchemaEvolutionToAccountFor: [
      'AuthSession.sessionType and its index were introduced by a later migration and must coexist with the base objects.'
    ]
  });
  const sql = readFileSync(pilotMigration.path, 'utf8');
  for (const name of [
    'AuthSession',
    'Organisation_slug_key',
    'OrganisationMembership_userId_key',
    'AuthSession_tokenHash_key',
    'AuthSession_userId_expiresAt_idx',
    'AuthSession_expiresAt_idx',
    'User_email_normalised_check',
    'AuthSession_userId_fkey'
  ]) {
    assert.match(sql, new RegExp(name));
  }
});

test('reported pnpm workspace edit is absent and excluded from this worktree', () => {
  assert.equal(existsSync('pnpm-workspace.yaml'), false);
  assert.equal(
    execFileSync('git', ['status', '--short', '--', 'pnpm-workspace.yaml'], {
      encoding: 'utf8'
    }),
    ''
  );
});
