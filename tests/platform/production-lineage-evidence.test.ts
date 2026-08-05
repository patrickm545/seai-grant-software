import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT,
  type LineageAttestation
} from '../../lib/lineage-attestation';
import {
  assertVerifierEvidenceSecretFree,
  exitCodeFor,
  LineageVerifierError
} from '../../lib/lineage-verifier';
import type { MigrationLedgerRow } from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';
import {
  assertRepeatedProductionLineageEvidence,
  assertProductionEvidenceControls,
  captureProductionLineageEvidence
} from '../../lib/production-lineage-evidence';
import { preMigrationCatalog } from './schema-fingerprint.test';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;

function controls() {
  return assertProductionEvidenceControls({
    governanceMode: 'pilot-stage-compensating-control',
    changeId: 'CLADA-CHG-2026-07-28-044',
    operator: 'Patrick McKenna',
    restorePointReference: 'NEON-PITR-2026-07-28T09:00:00Z',
    pilotStageAccountabilityAcknowledgement: PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT
  });
}

function row(
  input: Partial<MigrationLedgerRow> &
    Pick<MigrationLedgerRow, 'id' | 'migration_name' | 'checksum'>
) {
  return {
    started_at: '2026-01-01T00:00:00.000Z',
    finished_at: '2026-01-01T00:00:00.001Z',
    applied_steps_count: 1,
    rolled_back_at: null,
    logs: null,
    ...input
  } satisfies MigrationLedgerRow;
}

function ledgerFixture() {
  const rows = manifest.migrations
    .filter(
      (migration) =>
        migration.name !== pending.relatedMigration.name &&
        migration.name !== '20260724180000_password_reset_foundation'
    )
    .map((migration, index) =>
      row({
        id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
        migration_name: migration.name,
        checksum: migration.checksum,
        started_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        finished_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.001Z`
      })
    );
  rows.push(
    row({
      id: pending.missingMigration.id!,
      migration_name: pending.missingMigration.migrationName,
      checksum: pending.missingMigration.checksum,
      started_at: pending.missingMigration.startedAt,
      finished_at: pending.missingMigration.finishedAt
    }),
    row({
      id: '11111111-1111-4111-8111-111111111111',
      migration_name: pending.relatedMigration.name,
      checksum: pending.relatedMigration.repositoryChecksum,
      started_at: pending.relatedMigration.failedRecord.startedAt,
      finished_at: null,
      applied_steps_count: 0,
      rolled_back_at: pending.relatedMigration.failedRecord.rolledBackAt,
      logs: 'duplicate Lead.internalNotes'
    }),
    row({
      id: '22222222-2222-4222-8222-222222222222',
      migration_name: pending.relatedMigration.name,
      checksum: pending.relatedMigration.repositoryChecksum,
      started_at: pending.relatedMigration.completedZeroStepRecord.startedAt,
      finished_at: pending.relatedMigration.completedZeroStepRecord.finishedAt,
      applied_steps_count: 0
    })
  );
  return rows;
}

function identity() {
  return {
    host: 'host.example',
    port: '5432',
    databaseName: 'clada',
    fingerprint: 'db_4e1d3bd23cff6801'
  };
}

test('pending attestation can capture exact secret-free Production evidence deterministically', () => {
  const input = {
    environment: 'production',
    identity: identity(),
    connectedDatabaseName: 'clada',
    repositoryRevision: 'e4bde0c21f1e8135a82761ad4ea08d1c89a658eb',
    manifest,
    attestation: pending,
    ledgerRows: ledgerFixture(),
    catalog: preMigrationCatalog(),
    controls: controls()
  };
  const first = captureProductionLineageEvidence({
    ...input,
    capturedAt: new Date('2026-07-28T10:00:00.000Z')
  });
  const second = captureProductionLineageEvidence({
    ...input,
    capturedAt: new Date('2026-07-28T10:01:00.000Z')
  });
  assert.equal(first.deterministicEvidenceDigest, second.deterministicEvidenceDigest);
  assert.equal(assertRepeatedProductionLineageEvidence(first, second).result, 'matched');
  assert.equal(first.schema.fingerprint, second.schema.fingerprint);
  assert.deepEqual(first.ledger.pendingMigrations, [
    '20260724180000_password_reset_foundation'
  ]);
  const failed = first.ledger.records.find(
    (record) => record.rolledBackAt === pending.relatedMigration.failedRecord.rolledBackAt
  )!;
  assert.equal(failed.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(
    failed.logsDigest,
    createHash('sha256').update('duplicate Lead.internalNotes').digest('hex')
  );
  assert.equal(JSON.stringify(first).includes('duplicate Lead.internalNotes'), false);
  assert.doesNotThrow(() => assertVerifierEvidenceSecretFree(first));
});

test('repeated capture terminates when any deterministic evidence differs', () => {
  const input = {
    environment: 'production',
    identity: identity(),
    connectedDatabaseName: 'clada',
    repositoryRevision: 'e4bde0c21f1e8135a82761ad4ea08d1c89a658eb',
    manifest,
    attestation: pending,
    ledgerRows: ledgerFixture(),
    catalog: preMigrationCatalog(),
    controls: controls()
  };
  const first = captureProductionLineageEvidence(input);
  const second = captureProductionLineageEvidence({
    ...input,
    repositoryRevision: 'c745f55cc4141e900b95c0f91be89a0968db27ec'
  });
  assert.throws(
    () => assertRepeatedProductionLineageEvidence(first, second),
    /differs; discard the evidence and stop/
  );
});

test('capture rejects wrong identity, changed ledger, and non-pending attestation', () => {
  const base = {
    environment: 'production',
    identity: identity(),
    connectedDatabaseName: 'clada',
    repositoryRevision: 'e4bde0c21f1e8135a82761ad4ea08d1c89a658eb',
    manifest,
    attestation: pending,
    ledgerRows: ledgerFixture(),
    catalog: preMigrationCatalog(),
    controls: controls()
  };
  assert.throws(
    () =>
      captureProductionLineageEvidence({
        ...base,
        identity: { ...identity(), fingerprint: 'db_31449de1074844bb' }
      }),
    (error: unknown) =>
      error instanceof LineageVerifierError &&
      error.code === 'IDENTITY_MISMATCH' &&
      exitCodeFor(error) === 23
  );
  const changedRows = ledgerFixture();
  changedRows[0].checksum = 'f'.repeat(64);
  let completeEvidence: ReturnType<typeof captureProductionLineageEvidence> | undefined;
  assert.throws(
    () => {
      completeEvidence = captureProductionLineageEvidence({ ...base, ledgerRows: changedRows });
    },
    (error: unknown) => {
      assert.ok(error instanceof LineageVerifierError);
      assert.equal(error.code, 'LEDGER_MISMATCH');
      assert.equal(exitCodeFor(error), 25);
      assert.match(error.message, /not an exact successful application/);
      assert.match(error.message, /exactSuccessReport=/);
      assert.match(error.message, /checksum-mismatch/);
      assert.ok(error.cause instanceof Error);
      return true;
    }
  );
  assert.equal(completeEvidence, undefined);
  assert.throws(
    () =>
      captureProductionLineageEvidence({
        ...base,
        attestation: { ...pending, status: 'active' }
      }),
    (error: unknown) =>
      error instanceof LineageVerifierError &&
      error.code === 'UNSAFE_CONFIGURATION' &&
      exitCodeFor(error) === 27
  );
});

test('catalog mismatch is classified instead of collapsing to exit 70', () => {
  const catalog = structuredClone(preMigrationCatalog());
  catalog.columns[0].nullable = !catalog.columns[0].nullable;

  assert.throws(
    () =>
      captureProductionLineageEvidence({
        environment: 'production',
        identity: identity(),
        connectedDatabaseName: 'clada',
        repositoryRevision: 'e4bde0c21f1e8135a82761ad4ea08d1c89a658eb',
        manifest,
        attestation: pending,
        ledgerRows: ledgerFixture(),
        catalog,
        controls: controls()
      }),
    (error: unknown) => {
      assert.ok(error instanceof LineageVerifierError);
      assert.equal(error.code, 'SCHEMA_MISMATCH');
      assert.equal(exitCodeFor(error), 26);
      assert.ok(error.cause instanceof Error);
      return true;
    }
  );
});

test('database-only metadata mismatch remains exit 25 and emits no complete evidence', () => {
  const rows = ledgerFixture();
  const missing = rows.find(
    (record) => record.migration_name === pending.missingMigration.migrationName
  )!;
  missing.checksum = 'f'.repeat(64);
  let completeEvidence: ReturnType<typeof captureProductionLineageEvidence> | undefined;

  assert.throws(
    () => {
      completeEvidence = captureProductionLineageEvidence({
        environment: 'production',
        identity: identity(),
        connectedDatabaseName: 'clada',
        repositoryRevision: 'e4bde0c21f1e8135a82761ad4ea08d1c89a658eb',
        manifest,
        attestation: pending,
        ledgerRows: rows,
        catalog: preMigrationCatalog(),
        controls: controls()
      });
    },
    (error: unknown) => {
      assert.ok(error instanceof LineageVerifierError);
      assert.equal(error.code, 'LEDGER_MISMATCH');
      assert.equal(exitCodeFor(error), 25);
      assert.match(error.message, /mismatchReport=/);
      return true;
    }
  );
  assert.equal(completeEvidence, undefined);
});

test('capture controls require exact distinct human operators and evidence references', () => {
  assert.throws(
    () =>
      assertProductionEvidenceControls({
        changeId: 'TBD',
        operator: 'Patrick',
        independentReviewer: 'Reviewer',
        restorePointReference: 'restore'
      }),
    /non-placeholder/
  );
  assert.throws(
    () =>
      assertProductionEvidenceControls({
        changeId: 'CLADA-CHG-044',
        operator: 'Patrick',
        independentReviewer: 'patrick',
        restorePointReference: 'restore'
      }),
    /different people/
  );
  assert.throws(
    () =>
      assertProductionEvidenceControls({
        governanceMode: 'pilot-stage-compensating-control',
        changeId: 'CLADA-CHG-044',
        operator: 'Patrick McKenna',
        independentReviewer: 'Invented Reviewer',
        restorePointReference: 'restore',
        pilotStageAccountabilityAcknowledgement: PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT
      }),
    /must not identify an independent reviewer/
  );
  assert.throws(
    () =>
      assertProductionEvidenceControls({
        governanceMode: 'pilot-stage-compensating-control',
        changeId: 'CLADA-CHG-044',
        operator: 'Patrick McKenna',
        restorePointReference: 'restore'
      }),
    /accountability acknowledgement/
  );
});
