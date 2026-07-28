import { createHash } from 'node:crypto';
import type { SafeDatabaseIdentity } from './database-safety';
import { canonicalJson } from './canonical-json';
import {
  validateLineageAttestation,
  type LineageAttestation
} from './lineage-attestation';
import {
  normaliseMigrationRecord,
  verifyAttestedLedger,
  type MigrationLedgerRow
} from './migration-ledger';
import type { MigrationManifest } from './migration-manifest';
import {
  assertNamedCatalog,
  fingerprintCatalog,
  type CatalogSnapshot
} from './schema-fingerprint';

export const PRODUCTION_EVIDENCE_VERSION =
  'adr-0024-production-evidence-capture/v1' as const;

const prohibitedControlValue = /^(?:unknown|tbd|todo|placeholder|codex|chatgpt|openai)$/i;
const wildcardPattern = /[*?]|\.\*/;

function exactControl(value: string | undefined, label: string) {
  const exact = value?.trim();
  if (!exact || wildcardPattern.test(exact) || prohibitedControlValue.test(exact)) {
    throw new Error(`${label} must be an exact, non-placeholder value.`);
  }
  return exact;
}

export function assertProductionEvidenceControls(input: {
  changeId?: string;
  operator?: string;
  independentReviewer?: string;
  restorePointReference?: string;
}) {
  const controls = {
    changeId: exactControl(input.changeId, 'Production evidence change ID'),
    operator: exactControl(input.operator, 'Production evidence operator'),
    independentReviewer: exactControl(
      input.independentReviewer,
      'Production evidence independent reviewer'
    ),
    restorePointReference: exactControl(
      input.restorePointReference,
      'Production restore-point reference'
    )
  };
  if (controls.operator.toLocaleLowerCase() === controls.independentReviewer.toLocaleLowerCase()) {
    throw new Error('Production operator and independent reviewer must be different people.');
  }
  return controls;
}

export function captureProductionLineageEvidence(input: {
  environment: string;
  identity: SafeDatabaseIdentity;
  connectedDatabaseName: string;
  repositoryRevision: string;
  manifest: MigrationManifest;
  attestation: LineageAttestation;
  ledgerRows: MigrationLedgerRow[];
  catalog: CatalogSnapshot;
  controls: ReturnType<typeof assertProductionEvidenceControls>;
  capturedAt?: Date;
}) {
  if (
    input.environment !== 'production' ||
    input.identity.fingerprint !== 'db_4e1d3bd23cff6801' ||
    input.connectedDatabaseName !== input.identity.databaseName
  ) {
    throw new Error('Production evidence capture target identity differs from ADR-0024.');
  }
  if (input.attestation.status !== 'pending') {
    throw new Error('Production evidence capture is restricted to the pending attestation.');
  }
  validateLineageAttestation(input.attestation);
  if (input.attestation.approvedManifestHash !== input.manifest.manifestHash) {
    throw new Error('Production evidence manifest differs from the pending attestation.');
  }

  const records = input.ledgerRows
    .map(normaliseMigrationRecord)
    .sort((left, right) => {
      const leftKey = `${left.startedAt}\0${left.id}`;
      const rightKey = `${right.startedAt}\0${right.id}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
  const missing = records.filter(
    (record) => record.migrationName === input.attestation.missingMigration.migrationName
  );
  const related = records.filter(
    (record) => record.migrationName === input.attestation.relatedMigration.name
  );
  const failed = related.filter((record) => record.rolledBackAt !== null);
  const completedZeroStep = related.filter(
    (record) =>
      record.finishedAt !== null &&
      record.rolledBackAt === null &&
      record.appliedStepsCount === 0
  );
  if (
    missing.length !== 1 ||
    related.length !== 2 ||
    failed.length !== 1 ||
    completedZeroStep.length !== 1
  ) {
    throw new Error('Production evidence contains an ambiguous ADR-0024 record set.');
  }

  const observedAttestation = structuredClone(input.attestation);
  observedAttestation.relatedMigration.failedRecord.id = failed[0].id;
  observedAttestation.relatedMigration.failedRecord.logsDigest = failed[0].logsDigest;
  observedAttestation.relatedMigration.completedZeroStepRecord.id = completedZeroStep[0].id;
  const ledgerResult = verifyAttestedLedger({
    rows: input.ledgerRows,
    manifest: input.manifest,
    attestation: observedAttestation,
    mode: 'production-status',
    approvedPendingMigrations: ['20260724180000_password_reset_foundation']
  });

  const namedAssertions = assertNamedCatalog(input.catalog, 'pre-password-reset');
  const schema = fingerprintCatalog(input.catalog);
  const deterministicEvidence = {
    evidenceVersion: PRODUCTION_EVIDENCE_VERSION,
    environment: input.environment,
    databaseFingerprint: input.identity.fingerprint,
    connectedDatabaseNameMatchesGuard: true,
    repositoryRevision: input.repositoryRevision,
    verifierImplementationVersion: input.attestation.verifierImplementationVersion,
    manifestVersion: input.manifest.version,
    manifestHash: input.manifest.manifestHash,
    migrationInventory: input.manifest.migrations.map(({ position, name, checksum }) => ({
      position,
      name,
      checksum
    })),
    controls: input.controls,
    ledger: {
      totalRecords: records.length,
      records,
      pendingMigrations: ledgerResult.pending,
      appliedRepositoryCount: ledgerResult.appliedRepositoryCount,
      adr0024PinnedEvidenceResult: 'matched' as const
    },
    schema: {
      fingerprintVersion: schema.version,
      fingerprint: schema.fingerprint,
      namedAssertions,
      catalogCounts: {
        namespaces: input.catalog.namespaces.length,
        tables: input.catalog.tables.length,
        columns: input.catalog.columns.length,
        constraints: input.catalog.constraints.length,
        indexes: input.catalog.indexes.length,
        enums: input.catalog.enums.length,
        extensions: input.catalog.extensions.length,
        triggers: input.catalog.triggers.length,
        sequences: input.catalog.sequences.length,
        unsupportedObjects: input.catalog.unsupportedObjects.length
      },
      unsupportedObjects: input.catalog.unsupportedObjects
    }
  };
  return {
    ...deterministicEvidence,
    deterministicEvidenceDigest: createHash('sha256')
      .update(canonicalJson(deterministicEvidence))
      .digest('hex'),
    capturedAt: (input.capturedAt ?? new Date()).toISOString()
  };
}
