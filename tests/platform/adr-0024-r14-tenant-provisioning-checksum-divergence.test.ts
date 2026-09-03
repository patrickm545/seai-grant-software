import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
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
import { pendingLineageAttestationFixture } from './lineage-attestation-fixture';

const baseline = '90c2f1f95a7dbc6eeaac48df3d2ef0b3a336ac7c';
const migrationName = '20260718130000_tenant_provisioning_data_model';
const recordId = '5eeca647-5429-4beb-873b-cff91ec58ddf';
const canonicalChecksum = 'a741bc49cf4e8d92c36344f68706161ecdcc04625903eeb2a777b87b0f0151d7';
const observedChecksum = '2f45f84bce236107538226d722a64daf1fba564725d6c79a89f5c161a2d80805';
const evidenceReference =
  'docs/03-engineering/evidence/ADR_0024_R14_CHECKSUM_DIVERGENCE.json';
const evidenceSha256 = 'ca79db4c782a76b76e1dcbb84e46496d16b36cb463e68be904bc1962fe603da8';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = pendingLineageAttestationFixture();
const evidence = JSON.parse(readFileSync(evidenceReference, 'utf8')) as {
  classification: string;
  exactMatch: {
    normalizesByteForByteToCommittedBlob: boolean;
    lineEndingInsertions: number;
  };
};
const r14 = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
  (entry) => entry.migrationName === migrationName
)!;
const earlier = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.filter(
  (entry) => entry.migrationName !== migrationName
);
const migration = manifest.migrations.find((entry) => entry.name === migrationName)!;

function sha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function row(
  input: Partial<MigrationLedgerRow> &
    Pick<MigrationLedgerRow, 'id' | 'migration_name' | 'checksum'>
): MigrationLedgerRow {
  return {
    started_at: '2026-01-01T00:00:00.000001Z',
    finished_at: '2026-01-01T00:00:00.000002Z',
    applied_steps_count: 1,
    rolled_back_at: null,
    logs: null,
    ...input
  };
}

function productionFixture() {
  const attestation = structuredClone(pending);
  const historical = attestation.historicalResolvedMigrations[0];
  const rows = manifest.migrations
    .filter(
      (entry) =>
        entry.name !== attestation.relatedMigration.name &&
        entry.name !== '20260724180000_password_reset_foundation'
    )
    .map((entry, index) => {
      const divergence = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
        (candidate) => candidate.migrationName === entry.name
      );
      const historicalMatch = historical.migrationName === entry.name;
      return row({
        id:
          divergence?.recordId ??
          (historicalMatch
            ? historical.recordId
            : `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`),
        migration_name: entry.name,
        checksum:
          divergence?.observedProductionChecksum ??
          (historicalMatch ? historical.observedProductionChecksum : entry.checksum),
        applied_steps_count: historicalMatch ? historical.expectedAppliedStepsCount : 1,
        started_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000001Z`,
        finished_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000002Z`
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
    approvedPendingMigrations: ['20260724180000_password_reset_foundation'],
    historicalResolvedMigrationMode: 'pending-evidence-capture'
  });
}

function migrationRow(rows: MigrationLedgerRow[], name: string) {
  const result = rows.find((candidate) => candidate.migration_name === name);
  assert.ok(result);
  return result;
}

function canonicalRows() {
  return manifest.migrations.map((entry, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: entry.name,
      checksum: entry.checksum
    })
  );
}

test('canonical R14 migration and immutable manifest remain unchanged from the approved baseline', () => {
  execFileSync('git', [
    'diff',
    '--exit-code',
    baseline,
    '--',
    migration.path,
    'prisma/migration-manifest.json'
  ]);
  const committed = execFileSync('git', ['show', `HEAD:${migration.path}`], {
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
      manifestChecksum: migration.checksum,
      manifestHash: manifest.manifestHash
    },
    {
      bytes: 3795,
      bom: false,
      lineFeeds: 110,
      carriageReturns: 0,
      finalByte: 10,
      checksum: canonicalChecksum,
      manifestChecksum: canonicalChecksum,
      manifestHash: r14.approvedManifestHash
    }
  );
});

test('fresh canonical ledger remains strict and passes without Production exceptions', () => {
  assert.deepEqual(verifyStrictLedger(canonicalRows(), manifest).pending, []);
});

test('exact R14 Production tuple proceeds only through its explicit entry', () => {
  const result = verifyProductionFixture();
  assert.deepEqual(
    result.repositoryChecksumDivergences.find((entry) => entry.migrationName === migrationName),
    {
    migrationName,
    result: 'verified'
    }
  );
  assert.deepEqual(result.pending, ['20260724180000_password_reset_foundation']);
  assert.deepEqual(result.historicalResolvedMigrations.map((entry) => entry.migrationName), [
    pending.historicalResolvedMigrations[0].migrationName
  ]);
});

test('R10, R11 and R12 tuples cannot satisfy R14', () => {
  for (const other of earlier) {
    const fixture = productionFixture();
    const target = migrationRow(fixture.rows, migrationName);
    target.id = other.recordId;
    target.checksum = other.observedProductionChecksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R14 tuple cannot satisfy R10, R11 or R12', () => {
  for (const targetTuple of earlier) {
    const fixture = productionFixture();
    const target = migrationRow(fixture.rows, targetTuple.migrationName);
    target.id = recordId;
    target.checksum = observedChecksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('pilot-auth historical resolved state cannot satisfy ordinary R14', () => {
  const fixture = productionFixture();
  const historical = fixture.attestation.historicalResolvedMigrations[0];
  const target = migrationRow(fixture.rows, migrationName);
  target.id = historical.recordId;
  target.checksum = historical.observedProductionChecksum;
  target.applied_steps_count = historical.expectedAppliedStepsCount;
  assert.throws(() => verifyProductionFixture(fixture));
  assert.equal(historical.expectedAppliedStepsCount, 0);
  assert.equal(r14.expectedLifecycle.appliedStepsCount, 1);
});

test('R14 observed checksum remains rejected by strict Preview', () => {
  const rows = canonicalRows();
  migrationRow(rows, migrationName).checksum = observedChecksum;
  assert.throws(() => verifyStrictLedger(rows, manifest));
});

test('R14 tuple fails for another Production fingerprint', () => {
  const fixture = productionFixture();
  fixture.attestation.approvedDatabaseFingerprint =
    'db_aaaaaaaaaaaaaaaa' as LineageAttestation['approvedDatabaseFingerprint'];
  assert.throws(() => verifyProductionFixture(fixture));
});

test('R14 tuple fails for a wrong record ID', () => {
  const fixture = productionFixture();
  migrationRow(fixture.rows, migrationName).id = '33333333-3333-4333-8333-333333333333';
  assert.throws(() => verifyProductionFixture(fixture));
});

test('R14 tuple fails for a wrong canonical manifest checksum', () => {
  const fixture = productionFixture();
  fixture.manifest.migrations.find((entry) => entry.name === migrationName)!.checksum =
    'a'.repeat(64);
  assert.throws(() => verifyProductionFixture(fixture));
});

test('R14 tuple fails for a wrong observed checksum or one-bit-equivalent change', () => {
  for (const checksum of ['b'.repeat(64), `${observedChecksum.slice(0, -1)}4`]) {
    const fixture = productionFixture();
    migrationRow(fixture.rows, migrationName).checksum = checksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R14 tuple fails every non-success lifecycle and zero applied steps', () => {
  const mutations: Array<(target: MigrationLedgerRow) => void> = [
    (target) => {
      target.finished_at = null;
    },
    (target) => {
      target.rolled_back_at = '2026-01-01T00:00:00.000003Z';
    },
    (target) => {
      target.logs = 'unexpected migration log';
    },
    (target) => {
      target.applied_steps_count = 0;
    }
  ];
  for (const mutate of mutations) {
    const fixture = productionFixture();
    mutate(migrationRow(fixture.rows, migrationName));
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('missing or altered R14 evidence digest fails attestation validation', () => {
  const missing = structuredClone(pending);
  delete (missing.repositoryMigrationChecksumDivergences[3] as unknown as Record<string, unknown>)
    .checksumEvidenceSha256;
  assert.throws(() => validateLineageAttestation(missing));

  const altered = structuredClone(pending);
  (
    altered.repositoryMigrationChecksumDivergences[3] as unknown as Record<string, unknown>
  ).checksumEvidenceSha256 = 'f'.repeat(64);
  assert.throws(() => validateLineageAttestation(altered));
});

test('no wildcard, pattern, family or automatic alternate-checksum acceptance exists', () => {
  const wildcard = structuredClone(pending);
  (
    wildcard.repositoryMigrationChecksumDivergences[3] as unknown as Record<string, unknown>
  ).migrationName = '20260718*_tenant_provisioning_data_model';
  assert.throws(() => validateLineageAttestation(wildcard));

  const attestationSource = readFileSync('lib/lineage-attestation.ts', 'utf8');
  const ledgerSource = readFileSync('lib/migration-ledger.ts', 'utf8');
  for (const prohibited of [
    'allowCRLF',
    'acceptWindowsChecksums',
    'acceptedAlternateChecksums',
    'automaticAlternateChecksum'
  ]) {
    assert.doesNotMatch(`${attestationSource}\n${ledgerSource}`, new RegExp(prohibited));
  }
});

test('R14 byte reproduction is deterministic and platform-independent', () => {
  const committed = execFileSync('git', ['show', `HEAD:${migration.path}`], {
    encoding: 'buffer'
  });
  const alternate = Buffer.from(committed.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  const reversed = Buffer.from(alternate.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  assert.equal(alternate.length, 3905);
  assert.equal(sha256(alternate), observedChecksum);
  assert.equal((alternate.toString('utf8').match(/\r\n/g) ?? []).length, 110);
  assert.deepEqual(reversed, committed);
  assert.equal(evidence.classification, 'A-exact-alternate-byte-representation-proven');
  assert.equal(evidence.exactMatch.lineEndingInsertions, 110);
  assert.equal(evidence.exactMatch.normalizesByteForByteToCommittedBlob, true);
  assert.equal(sha256(readFileSync(evidenceReference)), evidenceSha256);
});

test('checked-in attestation command reports retired while pending fixture remains fail closed', () => {
  const offlineEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !/^(?:DATABASE_URL|DATABASE_|PRODUCTION_DATABASE_|PREVIEW_DATABASE_|TEST_DATABASE_|NEON_)/.test(
          key
        )
    )
  );
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/verify-migration-lineage.ts', 'attestation-verify'],
    { encoding: 'utf8', env: { ...offlineEnvironment, NODE_ENV: 'test' } }
  );
  assert.equal(result.status, 21, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /status=retired/);
  assert.equal(validateLineageAttestation(pending).status, 'pending');
  assert.equal(pending.pilotStageCompensatingControl?.captures.length, 0);
  assert.equal(pending.approvals.length, 0);
  assert.throws(
    () => validateLineageAttestation(pending, { requireActive: true }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_INACTIVE'
  );
});
