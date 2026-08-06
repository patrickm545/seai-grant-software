import { createHash } from 'node:crypto';
import type { SafeDatabaseIdentity } from './database-safety';
import { canonicalJson } from './canonical-json';
import {
  PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT,
  PILOT_STAGE_ACCOUNTABLE_PERSON,
  validateLineageAttestation,
  type GovernanceMode,
  type LineageAttestation
} from './lineage-attestation';
import { LineageVerifierError } from './lineage-verifier';
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
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      `${label} must be an exact, non-placeholder value.`
    );
  }
  return exact;
}

export function assertProductionEvidenceControls(input: {
  governanceMode?: GovernanceMode;
  changeId?: string;
  operator?: string;
  independentReviewer?: string;
  restorePointReference?: string;
  pilotStageAccountabilityAcknowledgement?: string;
}) {
  const common = {
    changeId: exactControl(input.changeId, 'Production evidence change ID'),
    operator: exactControl(input.operator, 'Production evidence operator'),
    restorePointReference: exactControl(
      input.restorePointReference,
      'Production restore-point reference'
    )
  };
  const governanceMode = input.governanceMode ?? 'standard-independent-human';
  if (
    governanceMode !== 'standard-independent-human' &&
    governanceMode !== 'pilot-stage-compensating-control'
  ) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Production evidence governance mode is unsupported.'
    );
  }
  if (governanceMode === 'pilot-stage-compensating-control') {
    if (input.independentReviewer?.trim()) {
      throw new LineageVerifierError(
        'UNSAFE_CONFIGURATION',
        'Pilot-stage compensating-control mode must not identify an independent reviewer who is unavailable.'
      );
    }
    if (common.operator !== PILOT_STAGE_ACCOUNTABLE_PERSON) {
      throw new LineageVerifierError(
        'UNSAFE_CONFIGURATION',
        `Pilot-stage Production operator must be ${PILOT_STAGE_ACCOUNTABLE_PERSON}.`
      );
    }
    if (input.pilotStageAccountabilityAcknowledgement !== PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT) {
      throw new LineageVerifierError(
        'UNSAFE_CONFIGURATION',
        'Pilot-stage Production owner accountability acknowledgement is incomplete.'
      );
    }
    return {
      governanceMode,
      ...common,
      independentReviewer: null,
      pilotStageAccountabilityAcknowledgement: PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT
    } as const;
  }
  const independentReviewer = exactControl(
    input.independentReviewer,
    'Production evidence independent reviewer'
  );
  if (common.operator.toLocaleLowerCase() === independentReviewer.toLocaleLowerCase()) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Production operator and independent reviewer must be different people.'
    );
  }
  return {
    governanceMode,
    ...common,
    independentReviewer,
    pilotStageAccountabilityAcknowledgement: null
  } as const;
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
    throw new LineageVerifierError(
      'IDENTITY_MISMATCH',
      'Production evidence capture target identity differs from ADR-0024.'
    );
  }
  if (input.attestation.status !== 'pending') {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Production evidence capture is restricted to the pending attestation.'
    );
  }
  validateLineageAttestation(input.attestation);
  if (input.attestation.governanceMode !== input.controls.governanceMode) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Production evidence governance mode differs from the pending attestation.'
    );
  }
  if (input.attestation.approvedManifestHash !== input.manifest.manifestHash) {
    throw new LineageVerifierError(
      'INVENTORY_MISMATCH',
      'Production evidence manifest differs from the pending attestation.'
    );
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
    throw new LineageVerifierError(
      'LEDGER_MISMATCH',
      'Production evidence contains an ambiguous ADR-0024 record set.'
    );
  }

  const observedAttestation = structuredClone(input.attestation);
  observedAttestation.relatedMigration.failedRecord.id = failed[0].id;
  observedAttestation.relatedMigration.failedRecord.logsDigest = failed[0].logsDigest;
  observedAttestation.relatedMigration.completedZeroStepRecord.id = completedZeroStep[0].id;
  let ledgerResult: ReturnType<typeof verifyAttestedLedger>;
  try {
    ledgerResult = verifyAttestedLedger({
      rows: input.ledgerRows,
      manifest: input.manifest,
      attestation: observedAttestation,
      mode: 'production-status',
      approvedPendingMigrations: ['20260724180000_password_reset_foundation']
    });
  } catch (error) {
    throw new LineageVerifierError(
      'LEDGER_MISMATCH',
      error instanceof Error ? error.message : 'Production ledger verification failed.',
      { cause: error }
    );
  }

  let namedAssertions: ReturnType<typeof assertNamedCatalog>;
  let schema: ReturnType<typeof fingerprintCatalog>;
  try {
    namedAssertions = assertNamedCatalog(input.catalog, 'pre-password-reset');
    schema = fingerprintCatalog(input.catalog);
  } catch (error) {
    throw new LineageVerifierError(
      'SCHEMA_MISMATCH',
      error instanceof Error ? error.message : 'Production schema verification failed.',
      { cause: error }
    );
  }
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
      adr0024PinnedEvidenceResult: 'matched' as const,
      repositoryChecksumDivergenceResult: ledgerResult.repositoryChecksumDivergence,
      repositoryChecksumDivergenceResults: ledgerResult.repositoryChecksumDivergences
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

export function assertRepeatedProductionLineageEvidence(
  first: ReturnType<typeof captureProductionLineageEvidence>,
  second: ReturnType<typeof captureProductionLineageEvidence>
) {
  const firstDigest = first.deterministicEvidenceDigest;
  const secondDigest = second.deterministicEvidenceDigest;
  const firstDeterministicEvidence: Record<string, unknown> = structuredClone(first);
  const secondDeterministicEvidence: Record<string, unknown> = structuredClone(second);
  delete firstDeterministicEvidence.capturedAt;
  delete firstDeterministicEvidence.deterministicEvidenceDigest;
  delete secondDeterministicEvidence.capturedAt;
  delete secondDeterministicEvidence.deterministicEvidenceDigest;
  if (
    firstDigest !== secondDigest ||
    canonicalJson(firstDeterministicEvidence) !== canonicalJson(secondDeterministicEvidence)
  ) {
    throw new LineageVerifierError(
      'INTERNAL_ERROR',
      'Repeated Production evidence differs; discard the evidence and stop the operation.'
    );
  }
  return {
    result: 'matched' as const,
    deterministicEvidenceDigest: firstDigest,
    firstCapturedAt: first.capturedAt,
    secondCapturedAt: second.capturedAt
  };
}
