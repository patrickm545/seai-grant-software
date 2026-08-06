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
import {
  verifyAttestedLedger,
  type MigrationLedgerRow
} from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';
import { verifyStrictLedger } from '../../lib/lineage-verifier';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;
const evidencePath =
  'docs/03-engineering/evidence/ADR_0024_R10_CHECKSUM_DIVERGENCE.json';
const target = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES[0];

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

function repositoryRow(
  migration: MigrationManifest['migrations'][number],
  index: number
): MigrationLedgerRow {
  const divergence = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
    (candidate) => candidate.migrationName === migration.name
  );
  return row({
    id: divergence
      ? divergence.recordId
      : `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
    migration_name: migration.name,
    checksum: divergence ? divergence.observedProductionChecksum : migration.checksum,
    started_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    finished_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.001Z`
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
    .map(repositoryRow);
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
  return { attestation, rows };
}

function verifyProductionFixture(fixture = productionFixture()) {
  return verifyAttestedLedger({
    rows: fixture.rows,
    manifest,
    attestation: fixture.attestation,
    mode: 'production-status',
    approvedPendingMigrations: ['20260724180000_password_reset_foundation']
  });
}

function targetRow(rows: MigrationLedgerRow[]) {
  const result = rows.find((candidate) => candidate.migration_name === target.migrationName);
  assert.ok(result);
  return result;
}

test('R10 evidence reproduces the exact Production checksum from only LF-to-CRLF bytes', () => {
  const committed = execFileSync(
    'git',
    ['show', `:${manifest.migrations.find((migration) => migration.name === target.migrationName)!.path}`],
    { encoding: 'buffer' }
  );
  const committedText = committed.toString('utf8');
  const crlf = Buffer.from(committedText.replace(/\n/g, '\r\n'), 'utf8');
  const normalized = Buffer.from(crlf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  assert.equal(committed.length, 6162);
  assert.equal(crlf.length, 6296);
  assert.equal((committedText.match(/\n/g) ?? []).length, 134);
  assert.equal(committed.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
  assert.equal(committed.at(-1), 10);
  assert.equal(sha256(committed), target.repositoryChecksum);
  assert.equal(sha256(crlf), target.observedProductionChecksum);
  assert.deepEqual(normalized, committed);

  const evidenceBytes = readFileSync(evidencePath);
  const evidence = JSON.parse(evidenceBytes.toString('utf8')) as {
    classification: string;
    candidates: Array<{
      transformation: string;
      sha256: string;
      byteLength: number;
    }>;
  };
  assert.equal(sha256(evidenceBytes), target.checksumEvidenceSha256);
  assert.equal(evidence.classification, target.checksumDivergenceClassification);
  assert.deepEqual(
    evidence.candidates.find(
      (candidate) => candidate.transformation === target.byteRepresentation
    ),
    {
      transformation: 'utf8-no-bom-crlf-with-final-newline',
      byteLength: 6296,
      sha256: target.observedProductionChecksum,
      matchesCanonicalRepositoryChecksum: false,
      matchesObservedProductionChecksum: true
    }
  );
});

test('canonical manifest integrity and fresh-database strict verification remain unchanged', () => {
  const manifestTarget = manifest.migrations.find(
    (migration) => migration.name === target.migrationName
  );
  assert.deepEqual(
    {
      checksum: manifestTarget?.checksum,
      byteLength: manifestTarget?.byteLength,
      manifestHash: manifest.manifestHash
    },
    {
      checksum: target.repositoryChecksum,
      byteLength: 6162,
      manifestHash: target.approvedManifestHash
    }
  );
  const freshRows = manifest.migrations.map((migration, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: migration.name,
      checksum: migration.checksum
    })
  );
  assert.deepEqual(verifyStrictLedger(freshRows, manifest).pending, []);
});

test('the exact Production tuple proceeds only through the scoped pending attestation path', () => {
  const result = verifyProductionFixture();
  assert.equal(result.repositoryChecksumDivergence, 'verified');
  assert.deepEqual(
    result.repositoryChecksumDivergences.map((divergence) => divergence.migrationName),
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.map((divergence) => divergence.migrationName)
  );
  assert.deepEqual(result.pending, ['20260724180000_password_reset_foundation']);
  assert.equal(validateLineageAttestation(pending).status, 'pending');
  assert.throws(
    () => validateLineageAttestation(pending, { requireActive: true }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_INACTIVE'
  );
});

test('the same alternate checksum is rejected by strict Preview or fresh-database verification', () => {
  const rows = manifest.migrations.map((migration, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: migration.name,
      checksum:
        migration.name === target.migrationName
          ? target.observedProductionChecksum
          : migration.checksum
    })
  );
  assert.throws(() => verifyStrictLedger(rows, manifest), /not an exact successful application/);
});

test('the Production attestation rejects canonical, one-bit, wrong-record and wrong-lifecycle variants', () => {
  const mutations: Array<(fixture: ReturnType<typeof productionFixture>) => void> = [
    (fixture) => {
      targetRow(fixture.rows).checksum = target.repositoryChecksum;
    },
    (fixture) => {
      targetRow(fixture.rows).checksum = `${target.observedProductionChecksum.slice(0, -1)}5`;
    },
    (fixture) => {
      targetRow(fixture.rows).id = '33333333-3333-4333-8333-333333333333';
    },
    (fixture) => {
      targetRow(fixture.rows).finished_at = null;
    },
    (fixture) => {
      targetRow(fixture.rows).rolled_back_at = '2026-01-01T00:00:00.002Z';
    },
    (fixture) => {
      targetRow(fixture.rows).applied_steps_count = 0;
    },
    (fixture) => {
      targetRow(fixture.rows).logs = 'unexpected';
    }
  ];
  for (const mutate of mutations) {
    const fixture = productionFixture();
    mutate(fixture);
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('another migration receives no CRLF exception and attestation tampering fails closed', () => {
  const fixture = productionFixture();
  const other = manifest.migrations.find(
    (migration) =>
      migration.name !== target.migrationName &&
      !PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
        (divergence) => divergence.migrationName === migration.name
      ) &&
      migration.name !== fixture.attestation.relatedMigration.name
  )!;
  const otherBytes = execFileSync('git', ['show', `:${other.path}`], { encoding: 'buffer' });
  const otherCrlfChecksum = sha256(
    Buffer.from(otherBytes.toString('utf8').replace(/\n/g, '\r\n'), 'utf8')
  );
  fixture.rows.find((candidate) => candidate.migration_name === other.name)!.checksum =
    otherCrlfChecksum;
  assert.throws(() => verifyProductionFixture(fixture), /not an exact successful application/);

  const tampered = productionFixture();
  tampered.attestation.repositoryMigrationChecksumDivergences = [
    {
      ...tampered.attestation.repositoryMigrationChecksumDivergences[0],
      recordId: '33333333-3333-4333-8333-333333333333'
    },
    tampered.attestation.repositoryMigrationChecksumDivergences[1]
  ] as unknown as typeof tampered.attestation.repositoryMigrationChecksumDivergences;
  assert.throws(() => verifyProductionFixture(tampered));
  assert.throws(() => validateLineageAttestation(tampered.attestation), /must be exact/);
});
