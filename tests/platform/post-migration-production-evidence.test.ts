import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT,
  type LineageAttestation
} from '../../lib/lineage-attestation';
import {
  assertPostMigrationProductionLineageEvidence,
  assertPostMigrationProductionEvidenceControls,
  assertRepeatedPostMigrationProductionLineageEvidence,
  capturePostMigrationProductionLineageEvidence,
  PASSWORD_RESET_MIGRATION_CHECKSUM,
  PASSWORD_RESET_MIGRATION_NAME,
  POST_MIGRATION_PRODUCTION_EVIDENCE_VERSION
} from '../../lib/post-migration-production-evidence';
import type { MigrationLedgerRow } from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';
import {
  assertVerifierEvidenceSecretFree,
  exitCodeFor,
  LineageVerifierError
} from '../../lib/lineage-verifier';
import { postPasswordResetCatalogWithPilotAuth } from './post-password-reset-catalog-fixture';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const checkedInAttestation = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;
const syntheticFailedLog = 'synthetic retained Prisma failure for repository-only testing';

function attestationFixture() {
  const attestation = structuredClone(checkedInAttestation);
  attestation.relatedMigration.failedRecord.logsDigest = createHash('sha256')
    .update(syntheticFailedLog)
    .digest('hex');
  return attestation;
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

function ledgerFixture(attestation = attestationFixture()) {
  const historical = attestation.historicalResolvedMigrations[0];
  const rows = manifest.migrations
    .filter((migration) => migration.name !== attestation.relatedMigration.name)
    .map((migration, index) => {
      const divergence = attestation.repositoryMigrationChecksumDivergences.find(
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
      logs: syntheticFailedLog
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
  return rows;
}

function controls() {
  return assertPostMigrationProductionEvidenceControls({
    governanceMode: 'pilot-stage-compensating-control',
    changeId: 'CHG-2099-01-01-ADR0024-POST-MIGRATION-PROD-VERIFY-R99',
    operator: 'Patrick McKenna',
    restorePointReference: 'NEON-RECOVERY-SYNTHETIC-TEST-REFERENCE',
    pilotStageAccountabilityAcknowledgement: PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT
  });
}

function identity() {
  return {
    host: 'secret-bearing-host-is-never-emitted.example',
    port: '5432',
    databaseName: 'neondb',
    branchId: 'br-cool-wave-abysq3lu',
    fingerprint: 'db_4e1d3bd23cff6801'
  };
}

function captureInput() {
  const attestation = attestationFixture();
  return {
    environment: 'production',
    identity: identity(),
    connectedDatabaseName: 'neondb',
    repositoryRevision: 'a'.repeat(40),
    manifest,
    attestation,
    ledgerRows: ledgerFixture(attestation),
    catalog: postPasswordResetCatalogWithPilotAuth(),
    controls: controls()
  };
}

function expectCode(operation: () => unknown, code: LineageVerifierError['code']) {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof LineageVerifierError);
    assert.equal(error.code, code);
    assert.equal(exitCodeFor(error) > 0, true);
    return true;
  });
}

test('retired v6 post-migration evidence captures all 16 migrations and complete deterministic descriptors', () => {
  const input = captureInput();
  const first = capturePostMigrationProductionLineageEvidence({
    ...input,
    captureOrdinal: 1,
    capturedAt: new Date('2026-08-26T10:00:00.000Z')
  });
  const second = capturePostMigrationProductionLineageEvidence({
    ...input,
    captureOrdinal: 2,
    capturedAt: new Date('2026-08-26T10:01:00.000Z')
  });
  const comparison = assertRepeatedPostMigrationProductionLineageEvidence(first, second);
  assert.equal(first.evidenceVersion, POST_MIGRATION_PRODUCTION_EVIDENCE_VERSION);
  assert.equal(first.deterministicEvidence.ledger.appliedRepositoryMigrations, 16);
  assert.deepEqual(first.deterministicEvidence.ledger.pendingMigrations, []);
  assert.equal(
    first.deterministicEvidence.ledger.finalRepositoryMigration.record.checksum,
    PASSWORD_RESET_MIGRATION_CHECKSUM
  );
  assert.equal(
    first.deterministicEvidence.ledger.ordinaryChecksumDivergenceResults.length,
    7
  );
  assert.equal(
    first.deterministicEvidence.ledger.historicalResolvedMigrationResults.length,
    1
  );
  assert.equal(
    first.deterministicEvidence.schema.catalogDescriptorDigest,
    first.deterministicEvidence.schema.fingerprint
  );
  assert.ok(first.deterministicEvidence.schema.catalogDescriptors.columns.length > 16);
  assert.equal(first.deterministicEvidence.schema.unsupportedObjects.length, 0);
  assert.equal(comparison.result, 'matched');
  assert.equal(first.deterministicEvidenceDigest, second.deterministicEvidenceDigest);
  assert.notEqual(first.capturedAt, second.capturedAt);
  assert.notEqual(first.logicalArtifactReference, second.logicalArtifactReference);
  assert.doesNotThrow(() => assertVerifierEvidenceSecretFree(first));
  assert.doesNotMatch(JSON.stringify(first), /secret-bearing-host/);
});

test('post-migration evidence rejects pending, active, wrong-version, or governance-crossed attestations', () => {
  for (const status of ['pending', 'active'] as const) {
    const input = captureInput();
    input.attestation.status = status;
    expectCode(
      () =>
        capturePostMigrationProductionLineageEvidence({
          ...input,
          captureOrdinal: 1
        }),
      'UNSAFE_CONFIGURATION'
    );
  }
  const wrongVersion = captureInput();
  (wrongVersion.attestation as { version: string }).version = 'clada-adr-0024-lineage-attestation/v5';
  expectCode(
    () => capturePostMigrationProductionLineageEvidence({ ...wrongVersion, captureOrdinal: 1 }),
    'UNSAFE_CONFIGURATION'
  );
});

test('post-migration ledger rejects pending, missing, duplicate, checksum, lifecycle, and log drift', () => {
  const mutations: Array<(rows: MigrationLedgerRow[]) => void> = [
    (rows) => {
      const index = rows.findIndex((item) => item.migration_name === PASSWORD_RESET_MIGRATION_NAME);
      rows.splice(index, 1);
    },
    (rows) => {
      rows.push({ ...rows.find((item) => item.migration_name === PASSWORD_RESET_MIGRATION_NAME)! });
    },
    (rows) => {
      rows.find((item) => item.migration_name === PASSWORD_RESET_MIGRATION_NAME)!.checksum = 'f'.repeat(64);
    },
    (rows) => {
      rows.find((item) => item.migration_name === PASSWORD_RESET_MIGRATION_NAME)!.applied_steps_count = 0;
    },
    (rows) => {
      rows.find((item) => item.migration_name === PASSWORD_RESET_MIGRATION_NAME)!.rolled_back_at = '2026-01-16T00:00:01.000Z';
    },
    (rows) => {
      rows.find((item) => item.migration_name === PASSWORD_RESET_MIGRATION_NAME)!.logs = 'unexpected';
    },
    (rows) => {
      rows.find((item) => item.migration_name === PASSWORD_RESET_MIGRATION_NAME)!.finished_at = null;
    },
    (rows) => {
      const another = rows.find((item) => item.migration_name === '20260526193000_launch_readiness')!;
      rows.splice(rows.indexOf(another), 1);
    }
  ];
  for (const mutate of mutations) {
    const input = captureInput();
    mutate(input.ledgerRows);
    expectCode(
      () => capturePostMigrationProductionLineageEvidence({ ...input, captureOrdinal: 1 }),
      'LEDGER_MISMATCH'
    );
  }
});

test('post-migration contract rejects a 17-migration manifest even when another migration is pending', () => {
  const input = captureInput();
  const changedManifest = structuredClone(input.manifest);
  changedManifest.migrations.push({
    ...changedManifest.migrations.at(-1)!,
    position: 16,
    name: '20990101000000_unapproved_future_migration',
    path: 'prisma/migrations/20990101000000_unapproved_future_migration/migration.sql'
  });
  expectCode(
    () =>
      capturePostMigrationProductionLineageEvidence({
        ...input,
        manifest: changedManifest,
        captureOrdinal: 1
      }),
    'INVENTORY_MISMATCH'
  );
});

test('post-migration evidence rejects every non-exact Production identity and environment', () => {
  for (const mutate of [
    (input: ReturnType<typeof captureInput>) => {
      input.environment = 'preview';
    },
    (input: ReturnType<typeof captureInput>) => {
      input.environment = 'development';
    },
    (input: ReturnType<typeof captureInput>) => {
      input.environment = 'test';
    },
    (input: ReturnType<typeof captureInput>) => {
      input.identity.fingerprint = 'db_1111111111111111';
    },
    (input: ReturnType<typeof captureInput>) => {
      input.identity.databaseName = 'disposable';
      input.connectedDatabaseName = 'disposable';
    },
    (input: ReturnType<typeof captureInput>) => {
      input.identity.branchId = 'br-preview';
    }
  ]) {
    const input = captureInput();
    mutate(input);
    expectCode(
      () => capturePostMigrationProductionLineageEvidence({ ...input, captureOrdinal: 1 }),
      'IDENTITY_MISMATCH'
    );
  }
});

test('post-migration evidence rejects schema drift and unsupported relations', () => {
  for (const mutate of [
    (input: ReturnType<typeof captureInput>) => {
      input.catalog.tables = input.catalog.tables.filter(
        (table) => table.name !== 'PasswordResetRequest'
      );
    },
    (input: ReturnType<typeof captureInput>) => {
      input.catalog.columns.find(
        (column) => column.table === 'PasswordResetRequest' && column.name === 'updatedAt'
      )!.nullable = true;
    },
    (input: ReturnType<typeof captureInput>) => {
      input.catalog.enums.find((item) => item.name === 'PasswordResetStatus')!.values.pop();
    },
    (input: ReturnType<typeof captureInput>) => {
      input.catalog.indexes = input.catalog.indexes.filter(
        (index) => index.name !== 'PasswordResetRequest_expiresAt_idx'
      );
    },
    (input: ReturnType<typeof captureInput>) => {
      input.catalog.constraints.find(
        (constraint) => constraint.name === 'PasswordResetRequest_userId_fkey'
      )!.definition = 'FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE';
    },
    (input: ReturnType<typeof captureInput>) => {
      input.catalog.unsupportedObjects.push({
        schema: 'public',
        name: 'unapproved_view',
        kind: 'v'
      });
    }
  ]) {
    const input = captureInput();
    mutate(input);
    expectCode(
      () => capturePostMigrationProductionLineageEvidence({ ...input, captureOrdinal: 1 }),
      'SCHEMA_MISMATCH'
    );
  }
});

test('catalog descriptor, fingerprint, and deterministic digests are independently checked', () => {
  const evidence = capturePostMigrationProductionLineageEvidence({
    ...captureInput(),
    captureOrdinal: 1
  });
  const descriptorDrift = structuredClone(evidence);
  descriptorDrift.deterministicEvidence.schema.catalogDescriptors.tables.pop();
  expectCode(
    () => assertPostMigrationProductionLineageEvidence(descriptorDrift),
    'SCHEMA_MISMATCH'
  );

  const descriptorDigestDrift = structuredClone(evidence);
  descriptorDigestDrift.deterministicEvidence.schema.catalogDescriptorDigest = 'f'.repeat(64);
  expectCode(
    () => assertPostMigrationProductionLineageEvidence(descriptorDigestDrift),
    'SCHEMA_MISMATCH'
  );

  const evidenceDigestDrift = structuredClone(evidence);
  evidenceDigestDrift.deterministicEvidenceDigest = 'f'.repeat(64);
  expectCode(
    () => assertPostMigrationProductionLineageEvidence(evidenceDigestDrift),
    'INTERNAL_ERROR'
  );
});

test('historical or pre-migration evidence cannot cross-satisfy post-migration validation', () => {
  expectCode(
    () =>
      assertPostMigrationProductionLineageEvidence({
        evidenceVersion: 'adr-0024-production-evidence-capture/v1',
        operationPurpose: 'historical-pre-migration-evidence'
      }),
    'UNSAFE_CONFIGURATION'
  );
});

test('dual-capture comparison covers stable payload fields and excludes only declared envelope fields', () => {
  const input = captureInput();
  const first = capturePostMigrationProductionLineageEvidence({
    ...input,
    captureOrdinal: 1
  });
  const second = capturePostMigrationProductionLineageEvidence({
    ...input,
    captureOrdinal: 2
  });
  second.deterministicEvidence.repositoryRevision = 'b'.repeat(40);
  second.deterministicEvidenceDigest = createHash('sha256')
    .update(JSON.stringify(second.deterministicEvidence))
    .digest('hex');
  expectCode(
    () => assertRepeatedPostMigrationProductionLineageEvidence(first, second),
    'INTERNAL_ERROR'
  );
});

test('post-migration controls admit only the distinct exact R-numbered operation family', () => {
  for (const changeId of [
    'CHG-2099-01-01-ADR0024-PROD-EVIDENCE-R99',
    'CHG-2099-01-01-ADR0024-POST-MIGRATION-PROD-VERIFY',
    'CHG-2099-01-01-ADR0024-POST-MIGRATION-PROD-VERIFY-R0',
    'CHG-2099-01-01-ADR0024-POST-MIGRATION-PROD-VERIFY-R1;whoami',
    '*'
  ]) {
    assert.throws(
      () =>
        assertPostMigrationProductionEvidenceControls({
          governanceMode: 'pilot-stage-compensating-control',
          changeId,
          operator: 'Patrick McKenna',
          restorePointReference: 'restore',
          pilotStageAccountabilityAcknowledgement:
            PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT
        }),
      /change ID|non-placeholder/
    );
  }
});
