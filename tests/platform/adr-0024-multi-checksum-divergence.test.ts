import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  AttestationValidationError,
  PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES,
  validateLineageAttestation,
  type LineageAttestation
} from '../../lib/lineage-attestation';
import { verifyStrictLedger } from '../../lib/lineage-verifier';
import { verifyAttestedLedger, type MigrationLedgerRow } from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;
const [r10, r11, r12, r14, r15] = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES;

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
          divergence?.recordId ??
          `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
        migration_name: migration.name,
        checksum: divergence?.observedProductionChecksum ?? migration.checksum,
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
  return { attestation, rows, manifest: structuredClone(manifest) };
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

function divergenceRow(rows: MigrationLedgerRow[], migrationName: string) {
  const result = rows.find((candidate) => candidate.migration_name === migrationName);
  assert.ok(result);
  return result;
}

test('R11 exact LF-to-CRLF evidence is reversible and raw-byte deterministic', () => {
  const manifestMigration = manifest.migrations.find(
    (migration) => migration.name === r11.migrationName
  );
  assert.ok(manifestMigration);
  const committed = execFileSync('git', ['show', `:${manifestMigration.path}`], {
    encoding: 'buffer'
  });
  const text = committed.toString('utf8');
  const alternate = Buffer.from(text.replace(/\n/g, '\r\n'), 'utf8');
  const reversed = Buffer.from(alternate.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  assert.deepEqual(
    {
      canonicalBytes: committed.length,
      alternateBytes: alternate.length,
      lineEndingInsertions: (text.match(/\n/g) ?? []).length,
      canonicalChecksum: sha256(committed),
      alternateChecksum: sha256(alternate),
      bom: committed.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
      finalNewline: committed.at(-1)
    },
    {
      canonicalBytes: 3951,
      alternateBytes: 4064,
      lineEndingInsertions: 113,
      canonicalChecksum: r11.repositoryChecksum,
      alternateChecksum: r11.observedProductionChecksum,
      bom: false,
      finalNewline: 10
    }
  );
  assert.deepEqual(reversed, committed);
  const evidenceBytes = readFileSync(r11.checksumEvidenceReference);
  assert.equal(sha256(evidenceBytes), r11.checksumEvidenceSha256);
});

test('R12 workflow foundation evidence exactly reproduces the observed CRLF checksum', () => {
  const manifestMigration = manifest.migrations.find(
    (migration) => migration.name === r12.migrationName
  );
  assert.ok(manifestMigration);
  const committed = execFileSync('git', ['show', `:${manifestMigration.path}`], {
    encoding: 'buffer'
  });
  const text = committed.toString('utf8');
  const alternate = Buffer.from(text.replace(/\n/g, '\r\n'), 'utf8');
  const reversed = Buffer.from(alternate.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  assert.deepEqual(
    {
      canonicalBytes: committed.length,
      alternateBytes: alternate.length,
      lineEndingInsertions: (text.match(/\n/g) ?? []).length,
      canonicalChecksum: sha256(committed),
      alternateChecksum: sha256(alternate),
      bom: committed.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
      finalNewline: committed.at(-1)
    },
    {
      canonicalBytes: 12927,
      alternateBytes: 13190,
      lineEndingInsertions: 263,
      canonicalChecksum: r12.repositoryChecksum,
      alternateChecksum: r12.observedProductionChecksum,
      bom: false,
      finalNewline: 10
    }
  );
  assert.deepEqual(reversed, committed);
  const evidenceBytes = readFileSync(r12.checksumEvidenceReference);
  assert.equal(sha256(evidenceBytes), r12.checksumEvidenceSha256);
});

test('canonical manifest and fresh-database verification remain canonical-only', () => {
  for (const divergence of PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES) {
    const migration = manifest.migrations.find(
      (candidate) => candidate.name === divergence.migrationName
    );
    assert.equal(migration?.checksum, divergence.repositoryChecksum);
  }
  const freshRows = manifest.migrations.map((migration, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: migration.name,
      checksum: migration.checksum
    })
  );
  assert.deepEqual(verifyStrictLedger(freshRows, manifest).pending, []);
  assert.equal(manifest.manifestHash, r12.approvedManifestHash);
});

test('all five exact Production tuples verify independently through the pending attested path', () => {
  const result = verifyProductionFixture();
  assert.deepEqual(result.repositoryChecksumDivergences, [
    { migrationName: r10.migrationName, result: 'verified' },
    { migrationName: r11.migrationName, result: 'verified' },
    { migrationName: r12.migrationName, result: 'verified' },
    { migrationName: r14.migrationName, result: 'verified' },
    { migrationName: r15.migrationName, result: 'verified' }
  ]);
  assert.deepEqual(result.pending, ['20260724180000_password_reset_foundation']);
});

test('R10, R11, R12, R14 and R15 tuples cannot cross-satisfy', () => {
  const tuples = [r10, r11, r12, r14, r15];
  for (const target of tuples) {
    for (const other of tuples.filter((candidate) => candidate !== target)) {
      const fixture = productionFixture();
      const record = divergenceRow(fixture.rows, target.migrationName);
      record.id = other.recordId;
      record.checksum = other.observedProductionChecksum;
      assert.throws(() => verifyProductionFixture(fixture));
    }
  }
});

test('the R12 alternate checksum fails strict Preview and any unlisted migration', () => {
  const strictRows = manifest.migrations.map((migration, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: migration.name,
      checksum:
        migration.name === r12.migrationName
          ? r12.observedProductionChecksum
          : migration.checksum
    })
  );
  assert.throws(() => verifyStrictLedger(strictRows, manifest));

  const production = productionFixture();
  const unlisted = production.rows.find(
    (candidate) =>
      candidate.migration_name !== production.attestation.relatedMigration.name &&
      !PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
        (divergence) => divergence.migrationName === candidate.migration_name
      )
  );
  assert.ok(unlisted);
  unlisted.checksum = r12.observedProductionChecksum;
  assert.throws(() => verifyProductionFixture(production));
});

test('R12 wrong record, checksum, lifecycle, manifest or Production fingerprint fails closed', () => {
  const mutations: Array<(fixture: ReturnType<typeof productionFixture>) => void> = [
    (fixture) => {
      divergenceRow(fixture.rows, r12.migrationName).id =
        '33333333-3333-4333-8333-333333333333';
    },
    (fixture) => {
      divergenceRow(fixture.rows, r12.migrationName).checksum = r12.repositoryChecksum;
    },
    (fixture) => {
      divergenceRow(fixture.rows, r12.migrationName).checksum =
        `${r12.observedProductionChecksum.slice(0, -1)}0`;
    },
    (fixture) => {
      divergenceRow(fixture.rows, r12.migrationName).finished_at = null;
    },
    (fixture) => {
      divergenceRow(fixture.rows, r12.migrationName).applied_steps_count = 0;
    },
    (fixture) => {
      const migration = fixture.manifest.migrations.find(
        (candidate) => candidate.name === r12.migrationName
      );
      assert.ok(migration);
      migration.checksum = 'a'.repeat(64);
    },
    (fixture) => {
      fixture.attestation.approvedDatabaseFingerprint =
        'db_aaaaaaaaaaaaaaaa' as LineageAttestation['approvedDatabaseFingerprint'];
    }
  ];
  for (const mutate of mutations) {
    const fixture = productionFixture();
    mutate(fixture);
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('missing or changed tuple evidence and pattern-like attestation changes fail closed', () => {
  const missing = structuredClone(pending) as unknown as Record<string, unknown>;
  const missingDivergences = missing.repositoryMigrationChecksumDivergences as Array<
    Record<string, unknown>
  >;
  delete missingDivergences[2].checksumEvidenceSha256;
  assert.throws(() => validateLineageAttestation(missing as unknown as LineageAttestation));

  const changed = structuredClone(pending);
  changed.repositoryMigrationChecksumDivergences = [
    changed.repositoryMigrationChecksumDivergences[0],
    changed.repositoryMigrationChecksumDivergences[1],
    {
      ...changed.repositoryMigrationChecksumDivergences[2],
      checksumEvidenceSha256: 'f'.repeat(64)
    }
  ] as unknown as typeof changed.repositoryMigrationChecksumDivergences;
  assert.throws(() => validateLineageAttestation(changed));

  const wildcard = structuredClone(pending);
  wildcard.repositoryMigrationChecksumDivergences = [
    wildcard.repositoryMigrationChecksumDivergences[0],
    wildcard.repositoryMigrationChecksumDivergences[1],
    {
      ...wildcard.repositoryMigrationChecksumDivergences[2],
      migrationName: '20260710*_workflow_foundation'
    }
  ] as unknown as typeof wildcard.repositoryMigrationChecksumDivergences;
  assert.throws(() => validateLineageAttestation(wildcard));
});

test('every independently pinned R12 tuple field is immutable', () => {
  const mutations: Array<(tuple: Record<string, unknown>) => void> = [
    (tuple) => {
      tuple.recordId = '44444444-4444-4444-8444-444444444444';
    },
    (tuple) => {
      tuple.repositoryChecksum = 'a'.repeat(64);
    },
    (tuple) => {
      tuple.observedProductionChecksum = 'b'.repeat(64);
    },
    (tuple) => {
      tuple.productionDatabaseFingerprint = 'db_aaaaaaaaaaaaaaaa';
    },
    (tuple) => {
      tuple.environment = 'preview';
    },
    (tuple) => {
      tuple.approvedRepositoryLineageBaseline = 'c'.repeat(40);
    },
    (tuple) => {
      tuple.approvedManifestHash = 'd'.repeat(64);
    },
    (tuple) => {
      tuple.expectedLifecycle = {
        startedAt: 'present-valid-canonical-utc-timestamp',
        finishedAt: 'present-valid-canonical-utc-timestamp',
        appliedStepsCount: 0,
        rolledBackAt: null,
        logsState: 'none',
        logsDigest: null
      };
    }
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(pending);
    const tuple = changed.repositoryMigrationChecksumDivergences[2] as unknown as Record<
      string,
      unknown
    >;
    mutate(tuple);
    assert.throws(() => validateLineageAttestation(changed));
    assert.throws(() => verifyProductionFixture({ ...productionFixture(), attestation: changed }));
  }
});

test('attestation remains pending with no captures, approvals or active acceptance', () => {
  assert.equal(validateLineageAttestation(pending).status, 'pending');
  assert.equal(pending.pilotStageCompensatingControl?.captures.length, 0);
  assert.equal(pending.approvals.length, 0);
  assert.throws(
    () => validateLineageAttestation(pending, { requireActive: true }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_INACTIVE'
  );
});
