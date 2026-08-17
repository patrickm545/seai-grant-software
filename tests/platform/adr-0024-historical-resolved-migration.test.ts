import assert from 'node:assert/strict';
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
  HISTORICAL_RESOLVED_MIGRATION_STATE_NAME,
  PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY,
  PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY_SHA256,
  PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS,
  assertPilotAuthHistoricalResolvedCatalog
} from '../../lib/historical-resolved-migration';
import {
  RepositoryMigrationExactSuccessError,
  assertExactSuccessfulRepositoryMigration,
  normaliseMigrationRecord,
  verifyAttestedLedger,
  type MigrationLedgerRow
} from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';
import { verifyStrictLedger } from '../../lib/lineage-verifier';
import { activeAttestation } from './lineage-attestation.test';
import { preMigrationCatalogWithPilotAuth } from './historical-resolved-migration-fixture';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;
const pilotMigration = manifest.migrations.find(
  (migration) => migration.name === PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS.migrationName
)!;

function sha256(value: string) {
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

function activeLedgerFixture() {
  const attestation = activeAttestation();
  const historical = attestation.historicalResolvedMigrations[0];
  const failedLog = 'synthetic duplicate-column failure';
  attestation.relatedMigration.failedRecord.logsDigest = sha256(failedLog);
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
      const isHistorical = migration.name === historical.migrationName;
      return row({
        id: isHistorical
          ? historical.recordId
          : divergence?.recordId ??
            `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
        migration_name: migration.name,
        checksum: isHistorical
          ? historical.observedProductionChecksum
          : divergence?.observedProductionChecksum ?? migration.checksum,
        started_at: isHistorical
          ? historical.exactLedgerTimestamps.startedAt!
          : `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        finished_at: isHistorical
          ? historical.exactLedgerTimestamps.finishedAt!
          : `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.001Z`,
        applied_steps_count: isHistorical ? 0 : 1
      });
    });
  rows.push(
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
      logs: failedLog
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
  return { attestation, rows };
}

function verifyHistoricalActive(fixture = activeLedgerFixture()) {
  return verifyAttestedLedger({
    rows: fixture.rows,
    manifest,
    attestation: fixture.attestation,
    mode: 'production-status',
    approvedPendingMigrations: ['20260724180000_password_reset_foundation'],
    historicalResolvedMigrationMode: 'active-attestation'
  });
}

test('pending pilot historical state is exact, structurally valid, and non-activatable', () => {
  assert.equal(validateLineageAttestation(pending).status, 'pending');
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(pending.historicalResolvedMigrations[0]).filter(
        ([key]) => !['exactLedgerTimestamps', 'observedCurrentSchema', 'r14Evidence'].includes(key)
      )
    ),
    PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS
  );
  assert.equal(
    pending.historicalResolvedMigrations[0].stateName,
    HISTORICAL_RESOLVED_MIGRATION_STATE_NAME
  );
  assert.deepEqual(pending.historicalResolvedMigrations[0].exactLedgerTimestamps, {
    startedAt: null,
    finishedAt: null
  });
  assert.equal(pending.historicalResolvedMigrations[0].observedCurrentSchema.fingerprint, null);
  assert.deepEqual(pending.historicalResolvedMigrations[0].r14Evidence.captureArtifactReferences, []);
  assert.throws(
    () => validateLineageAttestation(pending, { requireActive: true }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_INACTIVE'
  );
  assert.equal(pending.pilotStageCompensatingControl?.captures.length, 0);
  assert.equal(pending.approvals.length, 0);
});

test('known historical scope and retained evidence are immutable exact values', () => {
  const changes: Array<(historical: Record<string, unknown>) => void> = [
    (historical) => {
      historical.resolveEvidenceReference = '';
    },
    (historical) => {
      historical.resolveEvidenceSha256 = '0'.repeat(64);
    },
    (historical) => {
      historical.observedProductionChecksum = '0'.repeat(64);
    },
    (historical) => {
      historical.recordId = '11111111-1111-4111-8111-111111111111';
    },
    (historical) => {
      historical.productionDatabaseFingerprint = 'db_31449de1074844bb';
    },
    (historical) => {
      historical.migrationName = '20260716183000_pilot_installer_auth_copy';
    }
  ];
  for (const change of changes) {
    const changed = structuredClone(pending);
    change(changed.historicalResolvedMigrations[0] as unknown as Record<string, unknown>);
    assert.throws(() => validateLineageAttestation(changed), /known fields must be exact/);
  }
});

test('ordinary migration success remains canonical checksum plus exactly one applied step', () => {
  const ordinary = normaliseMigrationRecord(
    row({
      id: '11111111-1111-4111-8111-111111111111',
      migration_name: pilotMigration.name,
      checksum: pilotMigration.checksum,
      applied_steps_count: 1
    })
  );
  assert.doesNotThrow(() => assertExactSuccessfulRepositoryMigration([ordinary], pilotMigration));
  const zeroStep = { ...ordinary, appliedStepsCount: 0 };
  assert.throws(
    () => assertExactSuccessfulRepositoryMigration([zeroStep], pilotMigration),
    (error: unknown) =>
      error instanceof RepositoryMigrationExactSuccessError &&
      error.report.failures.some((failure) => failure.reason === 'applied-step-count-mismatch')
  );
  assert.throws(() =>
    verifyAttestedLedger({
      ...activeLedgerFixture(),
      manifest,
      mode: 'production-status',
      approvedPendingMigrations: ['20260724180000_password_reset_foundation']
    })
  );
});

test('only the exact active pilot record satisfies the historical zero-step path', () => {
  const result = verifyHistoricalActive();
  assert.deepEqual(
    result.historicalResolvedMigrations.map(({ migrationName, result: state }) => ({
      migrationName,
      state
    })),
    [{
      migrationName: PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS.migrationName,
      state: 'verified'
    }]
  );

  const mutations: Array<(record: MigrationLedgerRow) => void> = [
    (record) => {
      record.id = '33333333-3333-4333-8333-333333333333';
    },
    (record) => {
      record.checksum = pilotMigration.checksum;
    },
    (record) => {
      record.applied_steps_count = 1;
    },
    (record) => {
      record.rolled_back_at = '2026-07-17T13:00:00.123457Z';
    },
    (record) => {
      record.logs = 'unexpected historical log';
    }
  ];
  for (const mutate of mutations) {
    const changed = activeLedgerFixture();
    const record = changed.rows.find(
      (candidate) => candidate.migration_name === pilotMigration.name
    )!;
    mutate(record);
    assert.throws(() => verifyHistoricalActive(changed));
  }
});

test('another zero-step migration and strict non-Production paths cannot reuse the exception', () => {
  const ordinary = manifest.migrations.find(
    (migration) =>
      migration.name !== pilotMigration.name &&
      !PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
        (divergence) => divergence.migrationName === migration.name
      )
  )!;
  const changed = activeLedgerFixture();
  changed.rows.find((record) => record.migration_name === ordinary.name)!.applied_steps_count = 0;
  assert.throws(() => verifyHistoricalActive(changed));

  const strictRows = manifest.migrations.map((migration, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: migration.name,
      checksum:
        migration.name === pilotMigration.name
          ? PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS.observedProductionChecksum
          : migration.checksum,
      applied_steps_count: migration.name === pilotMigration.name ? 0 : 1
    })
  );
  for (const environment of ['preview', 'development', 'test']) {
    assert.throws(
      () => verifyStrictLedger(strictRows, manifest),
      `the ${environment} strict path must reject the historical Production row`
    );
  }
});

test('active state requires current schema evidence, exact ledger timestamps, and R14 binding', () => {
  for (const mutate of [
    (value: LineageAttestation) => {
      value.historicalResolvedMigrations[0].observedCurrentSchema.fingerprint = null;
    },
    (value: LineageAttestation) => {
      value.historicalResolvedMigrations[0].exactLedgerTimestamps.startedAt = null;
    },
    (value: LineageAttestation) => {
      value.historicalResolvedMigrations[0].r14Evidence.captureArtifactReferences = [];
    },
    (value: LineageAttestation) => {
      value.historicalResolvedMigrations[0].observedCurrentSchema.fingerprint = '0'.repeat(64);
    }
  ]) {
    const changed = activeAttestation();
    mutate(changed);
    assert.throws(() => validateLineageAttestation(changed, { requireActive: true }));
  }
});

test('canonical inventory accepts only the declared evolved AuthSession end-state', () => {
  assert.equal(PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.stateName, HISTORICAL_RESOLVED_MIGRATION_STATE_NAME);
  assert.equal(
    createHash('sha256')
      .update(readFileSync('docs/03-engineering/evidence/ADR_0024_PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.json'))
      .digest('hex'),
    PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY_SHA256
  );
  const catalog = preMigrationCatalogWithPilotAuth();
  assert.doesNotThrow(() => assertPilotAuthHistoricalResolvedCatalog(catalog));
  assert.deepEqual(
    catalog.enums.find((entry) => entry.name === 'AuthSessionType')?.values,
    ['NORMAL', 'RESTRICTED_FIRST_LOGIN']
  );
  assert.deepEqual(
    catalog.indexes.find(
      (entry) => entry.name === 'AuthSession_userId_sessionType_expiresAt_idx'
    )?.keyColumns,
    ['userId', 'sessionType', 'expiresAt']
  );

  const incompatible = [
    (() => {
      const value = structuredClone(catalog);
      value.columns.find((column) => column.name === 'sessionType')!.nullable = true;
      return value;
    })(),
    (() => {
      const value = structuredClone(catalog);
      value.enums.find((entry) => entry.name === 'AuthSessionType')!.values.push('UNDECLARED');
      return value;
    })(),
    (() => {
      const value = structuredClone(catalog);
      value.indexes.push({
        ...value.indexes.find((entry) => entry.name === 'AuthSession_tokenHash_key')!
      });
      return value;
    })()
  ];
  for (const value of incompatible) {
    assert.throws(() => assertPilotAuthHistoricalResolvedCatalog(value));
  }
});

test('ordinary one-step checksum divergences remain separate from historical resolved state', () => {
  assert.deepEqual(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.map((entry) => entry.migrationName),
    [
      '20260710120000_identity_organisation_foundation',
      '20260710130000_users_roles_permissions_audit',
      '20260710140000_workflow_foundation',
      '20260718130000_tenant_provisioning_data_model',
      '20260718150000_tenant_first_login_activation',
      '20260720100000_tenant_operator_recovery'
    ]
  );
  assert.equal(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (entry) => String(entry.migrationName) === pilotMigration.name
    ),
    false
  );
  assert.equal(pending.historicalResolvedMigrations.length, 1);
});
