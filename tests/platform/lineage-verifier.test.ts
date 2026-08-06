import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getDatabaseIdentity } from '../../lib/database-safety';
import {
  assertVerifierEvidenceSecretFree,
  assertDeliberateProductionControls,
  exitCodeFor,
  LineageVerifierError,
  VERIFIER_EXIT_CODES,
  verifyLineage
} from '../../lib/lineage-verifier';
import type { LineageAttestation } from '../../lib/lineage-attestation';
import type { MigrationLedgerRow } from '../../lib/migration-ledger';
import { normaliseMigrationRecord } from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';
import { fingerprintCatalog } from '../../lib/schema-fingerprint';
import { activeAttestation } from './lineage-attestation.test';
import { preMigrationCatalog } from './schema-fingerprint.test';

const manifest = JSON.parse(readFileSync('prisma/migration-manifest.json', 'utf8')) as MigrationManifest;

function row(input: Partial<MigrationLedgerRow> & Pick<MigrationLedgerRow, 'id' | 'migration_name' | 'checksum'>) {
  return {
    started_at: '2026-01-01T00:00:00.000Z',
    finished_at: '2026-01-01T00:00:00.001Z',
    applied_steps_count: 1,
    rolled_back_at: null,
    logs: null,
    ...input
  } satisfies MigrationLedgerRow;
}

function productionFixture() {
  const attestation = activeAttestation();
  const catalog = preMigrationCatalog();
  attestation.schema.preMigrationFingerprint = fingerprintCatalog(catalog).fingerprint;
  const ledgerRows: MigrationLedgerRow[] = manifest.migrations
    .filter(
      (migration) =>
        migration.name !== '20260428120000_manual_submission_prep' &&
        migration.name !== '20260724180000_password_reset_foundation'
    )
    .map((migration, index) =>
      row({
        id:
          migration.name === attestation.repositoryMigrationChecksumDivergence.migrationName
            ? attestation.repositoryMigrationChecksumDivergence.recordId
            : `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
        migration_name: migration.name,
        checksum:
          migration.name === attestation.repositoryMigrationChecksumDivergence.migrationName
            ? attestation.repositoryMigrationChecksumDivergence.observedProductionChecksum
            : migration.checksum,
        started_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        finished_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.001Z`
      })
    );
  ledgerRows.push(
    row({
      id: attestation.missingMigration.id!,
      migration_name: attestation.missingMigration.migrationName,
      checksum: attestation.missingMigration.checksum,
      started_at: attestation.missingMigration.startedAt,
      finished_at: attestation.missingMigration.finishedAt
    }),
    row({
      id: attestation.relatedMigration.failedRecord.id!,
      migration_name: attestation.relatedMigration.name,
      checksum: attestation.relatedMigration.repositoryChecksum,
      started_at: attestation.relatedMigration.failedRecord.startedAt,
      finished_at: null,
      applied_steps_count: 0,
      rolled_back_at: attestation.relatedMigration.failedRecord.rolledBackAt,
      logs: 'duplicate Lead.internalNotes'
    }),
    row({
      id: attestation.relatedMigration.completedZeroStepRecord.id!,
      migration_name: attestation.relatedMigration.name,
      checksum: attestation.relatedMigration.repositoryChecksum,
      started_at: attestation.relatedMigration.completedZeroStepRecord.startedAt,
      finished_at: attestation.relatedMigration.completedZeroStepRecord.finishedAt,
      applied_steps_count: 0
    })
  );
  // Pin the synthetic log digest to the fixture's exact error text.
  const failed = ledgerRows.at(-2)!;
  attestation.relatedMigration.failedRecord.logsDigest =
    createHash('sha256').update(failed.logs!).digest('hex');
  return { attestation, catalog, ledgerRows };
}

function productionIdentity() {
  const identity = getDatabaseIdentity('postgresql://role:secret@host.example/clada');
  return { ...identity, fingerprint: 'db_4e1d3bd23cff6801' };
}

test('exact synthetic ADR-0024 lineage verifies but status remains pending-blocked', () => {
  const fixture = productionFixture();
  const evidence = verifyLineage({
    mode: 'production-status',
    environment: 'production',
    identity: productionIdentity(),
    connectedDatabaseName: 'clada',
    repositoryBaseline: '0ee3c67e8295ca8f988e5b60ec75b66c0f18741b',
    manifest,
    ...fixture,
    now: new Date('2026-08-01T00:00:00.000Z')
  });
  assert.equal(evidence.finalDecision, 'verified-pending-blocked');
  assert.deepEqual(evidence.pendingMigrations, ['20260724180000_password_reset_foundation']);
  assert.equal(evidence.attestedDiscrepancy, 'verified');
  assert.equal(evidence.attestedRepositoryChecksumDivergence, 'verified');
});

test('exact synthetic deliberate preflight passes and ledger mutations fail closed', () => {
  const fixture = productionFixture();
  const evidence = verifyLineage({
    mode: 'production-preflight',
    environment: 'production',
    identity: productionIdentity(),
    connectedDatabaseName: 'clada',
    repositoryBaseline: 'successor',
    manifest,
    ...fixture,
    now: new Date('2026-08-01T00:00:00.000Z'),
    changeId: 'CLADA-CHG-43'
  });
  assert.equal(evidence.finalDecision, 'verified-clean');
  for (const mutate of [
    (rows: MigrationLedgerRow[]) => {
      rows[0].checksum = 'f'.repeat(64);
    },
    (rows: MigrationLedgerRow[]) => {
      rows[0].finished_at = null;
    },
    (rows: MigrationLedgerRow[]) => {
      rows.push(row({ id: 'extra', migration_name: '20260101000000_extra', checksum: 'e'.repeat(64) }));
    },
    (rows: MigrationLedgerRow[]) => {
      rows.at(-3)!.applied_steps_count = 2;
    }
  ]) {
    const changed = productionFixture();
    mutate(changed.ledgerRows);
    assert.throws(
      () =>
        verifyLineage({
          mode: 'production-preflight',
          environment: 'production',
          identity: productionIdentity(),
          connectedDatabaseName: 'clada',
          repositoryBaseline: 'successor',
          manifest,
          ...changed,
          now: new Date('2026-08-01T00:00:00.000Z')
        }),
      (error: unknown) => error instanceof LineageVerifierError && error.code === 'LEDGER_MISMATCH'
    );
  }
});

test('wrong database, Preview use, inactive lifecycle, and schema drift fail closed', () => {
  const base = productionFixture();
  assert.throws(
    () =>
      verifyLineage({
        mode: 'production-status',
        environment: 'production',
        identity: productionIdentity(),
        connectedDatabaseName: 'clada',
        repositoryBaseline: 'successor',
        manifest,
        ledgerRows: base.ledgerRows,
        catalog: base.catalog
      }),
    (error: unknown) => error instanceof LineageVerifierError && error.code === 'IDENTITY_MISMATCH'
  );
  assert.throws(
    () =>
      verifyLineage({
        mode: 'production-status',
        environment: 'production',
        identity: { ...productionIdentity(), fingerprint: 'db_31449de1074844bb' },
        connectedDatabaseName: 'clada',
        repositoryBaseline: 'successor',
        manifest,
        ...base
      }),
    (error: unknown) => error instanceof LineageVerifierError && error.code === 'IDENTITY_MISMATCH'
  );
  assert.throws(
    () =>
      verifyLineage({
        mode: 'production-status',
        environment: 'preview',
        identity: productionIdentity(),
        connectedDatabaseName: 'clada',
        repositoryBaseline: 'successor',
        manifest,
        ...base
      }),
    /restricted/
  );
  const inactive = structuredClone(base.attestation) as LineageAttestation;
  inactive.status = 'pending';
  assert.throws(
    () =>
      verifyLineage({
        mode: 'production-status',
        environment: 'production',
        identity: productionIdentity(),
        connectedDatabaseName: 'clada',
        repositoryBaseline: 'successor',
        manifest,
        attestation: inactive,
        ledgerRows: base.ledgerRows,
        catalog: base.catalog
      }),
    (error: unknown) => error instanceof LineageVerifierError && error.code === 'ATTESTATION_INACTIVE'
  );
  const drift = productionFixture();
  drift.catalog.columns[0].nullable = false;
  assert.throws(
    () =>
      verifyLineage({
        mode: 'production-status',
        environment: 'production',
        identity: productionIdentity(),
        connectedDatabaseName: 'clada',
        repositoryBaseline: 'successor',
        manifest,
        ...drift,
        now: new Date('2026-08-01T00:00:00.000Z')
      }),
    (error: unknown) => error instanceof LineageVerifierError && error.code === 'SCHEMA_MISMATCH'
  );
});

test('evidence guard rejects URLs and secret-like fields, and exit codes are stable', () => {
  assert.doesNotThrow(() =>
    assertVerifierEvidenceSecretFree({ databaseFingerprint: 'db_4e1d3bd23cff6801', decision: 'blocked' })
  );
  assert.throws(() => assertVerifierEvidenceSecretFree({ databaseUrl: 'redacted' }), /Secret-like field/);
  assert.throws(
    () => assertVerifierEvidenceSecretFree({ message: 'postgresql://role:password@host/database' }),
    /Secret-like value/
  );
  assert.equal(
    exitCodeFor(new LineageVerifierError('LEDGER_MISMATCH', 'changed')),
    VERIFIER_EXIT_CODES.LEDGER_MISMATCH
  );
  assert.equal(exitCodeFor(new Error('unknown')), VERIFIER_EXIT_CODES.INTERNAL_ERROR);
});

test('ledger normalization preserves significant microseconds and exact log bytes', () => {
  const normalized = normaliseMigrationRecord(
    row({
      id: 'microseconds',
      migration_name: '20260101000000_example',
      checksum: 'a'.repeat(64),
      started_at: '2026-01-01T00:00:00.123456Z',
      finished_at: '2026-01-01T00:00:00.123000Z',
      logs: ' duplicate error \n'
    })
  );
  assert.equal(normalized.startedAt, '2026-01-01T00:00:00.123456Z');
  assert.equal(normalized.finishedAt, '2026-01-01T00:00:00.123Z');
  assert.equal(
    normalized.logsDigest,
    createHash('sha256').update(' duplicate error \n').digest('hex')
  );
});

test('deliberate Production controls require every exact independent input', () => {
  const valid = {
    attestationId: 'ADR-0024-PRODUCTION-2026-07-25',
    acknowledgement: 'APPLY_APPROVED_PRODUCTION_MIGRATIONS',
    changeId: 'CLADA-CHG-2026-07-28-043',
    restorePointConfirmation: 'CONFIRMED_CURRENT_RESTORE_POINT'
  };
  assert.equal(assertDeliberateProductionControls(valid).changeId, valid.changeId);
  for (const field of Object.keys(valid) as Array<keyof typeof valid>) {
    assert.throws(
      () => assertDeliberateProductionControls({ ...valid, [field]: undefined }),
      (error: unknown) =>
        error instanceof LineageVerifierError && error.code === 'UNSAFE_CONFIGURATION'
    );
  }
  assert.throws(() => assertDeliberateProductionControls({ ...valid, changeId: '*' }), /change ID/);
});
