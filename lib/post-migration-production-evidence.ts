import { createHash } from 'node:crypto';
import type { SafeDatabaseIdentity } from './database-safety';
import { canonicalJson } from './canonical-json';
import { assertPilotAuthHistoricalResolvedCatalog } from './historical-resolved-migration';
import {
  ATTESTATION_VERSION,
  validateLineageAttestation,
  type GovernanceMode,
  type LineageAttestation
} from './lineage-attestation';
import { LineageVerifierError } from './lineage-verifier';
import {
  verifyAttestedLedger,
  type MigrationLedgerRow
} from './migration-ledger';
import type { MigrationManifest } from './migration-manifest';
import {
  assertPostPasswordResetCatalog
} from './post-password-reset-catalog';
import {
  assertProductionEvidenceControls
} from './production-lineage-evidence';
import {
  fingerprintCatalog,
  type CatalogSnapshot
} from './schema-fingerprint';

export const POST_MIGRATION_PRODUCTION_EVIDENCE_VERSION =
  'adr-0024-production-post-migration-evidence/v1' as const;
export const POST_MIGRATION_PRODUCTION_DUAL_CAPTURE_VERSION =
  'adr-0024-production-post-migration-dual-capture/v1' as const;
export const POST_MIGRATION_PRODUCTION_EVIDENCE_PURPOSE =
  'post-migration-production-verification' as const;
export const POST_MIGRATION_PRODUCTION_CHANGE_ID_PATTERN =
  /^CHG-\d{4}-\d{2}-\d{2}-ADR0024-POST-MIGRATION-PROD-VERIFY-R[1-9]\d*$/;
export const PASSWORD_RESET_MIGRATION_NAME =
  '20260724180000_password_reset_foundation' as const;
export const PASSWORD_RESET_MIGRATION_CHECKSUM =
  'cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7' as const;
export const POST_MIGRATION_PRODUCTION_DATABASE_NAME = 'neondb' as const;
export const POST_MIGRATION_PRODUCTION_BRANCH_ID = 'br-cool-wave-abysq3lu' as const;
export const POST_MIGRATION_PRODUCTION_DATABASE_FINGERPRINT =
  'db_4e1d3bd23cff6801' as const;

const repositoryShaPattern = /^[a-f0-9]{40}$/;

export function assertPostMigrationProductionEvidenceControls(input: {
  governanceMode?: GovernanceMode;
  changeId?: string;
  operator?: string;
  independentReviewer?: string;
  restorePointReference?: string;
  pilotStageAccountabilityAcknowledgement?: string;
}) {
  const controls = assertProductionEvidenceControls(input);
  if (!POST_MIGRATION_PRODUCTION_CHANGE_ID_PATTERN.test(controls.changeId)) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Post-migration Production verification change ID is outside the exact authorised operation family.'
    );
  }
  return controls;
}

function assertExactPostMigrationIdentity(input: {
  environment: string;
  identity: SafeDatabaseIdentity;
  connectedDatabaseName: string;
}) {
  if (
    input.environment !== 'production' ||
    input.identity.databaseName !== POST_MIGRATION_PRODUCTION_DATABASE_NAME ||
    input.connectedDatabaseName !== POST_MIGRATION_PRODUCTION_DATABASE_NAME ||
    input.identity.branchId !== POST_MIGRATION_PRODUCTION_BRANCH_ID ||
    input.identity.fingerprint !== POST_MIGRATION_PRODUCTION_DATABASE_FINGERPRINT
  ) {
    throw new LineageVerifierError(
      'IDENTITY_MISMATCH',
      'Post-migration Production evidence target identity differs from the exact ADR-0024 database.'
    );
  }
}

export function assertExactPostMigrationManifest(
  manifest: MigrationManifest,
  attestation: LineageAttestation
) {
  const passwordReset = manifest.migrations.filter(
    (migration) => migration.name === PASSWORD_RESET_MIGRATION_NAME
  );
  if (
    manifest.migrations.length !== 16 ||
    passwordReset.length !== 1 ||
    passwordReset[0].position !== 15 ||
    passwordReset[0].checksum !== PASSWORD_RESET_MIGRATION_CHECKSUM ||
    attestation.approvedManifestHash !== manifest.manifestHash
  ) {
    throw new LineageVerifierError(
      'INVENTORY_MISMATCH',
      'Post-migration Production evidence requires the exact approved 16-migration manifest.'
    );
  }
}

export function assertPostMigrationRetiredAttestation(
  attestation: LineageAttestation
) {
  if (
    attestation.version !== ATTESTATION_VERSION ||
    attestation.status !== 'retired' ||
    attestation.schema.postMigrationFingerprint !== null ||
    attestation.schema.postMigrationEvidence !== null ||
    attestation.pilotStageCompensatingControl?.captures.length !== 2 ||
    attestation.approvals.length !== 1
  ) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Post-migration Production evidence requires the exact retired ADR-0024 v6 lifecycle without new evidence or approval.'
    );
  }
  validateLineageAttestation(attestation);
  return attestation;
}

function assertRetiredAttestationContract(
  attestation: LineageAttestation,
  controls: ReturnType<typeof assertPostMigrationProductionEvidenceControls>
) {
  assertPostMigrationRetiredAttestation(attestation);
  if (attestation.governanceMode !== controls.governanceMode) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Post-migration Production evidence governance differs from the retired attestation.'
    );
  }
}

function catalogCounts(
  descriptors: ReturnType<typeof fingerprintCatalog>['canonical']
) {
  return {
    namespaces: descriptors.namespaces.length,
    tables: descriptors.tables.length,
    columns: descriptors.columns.length,
    constraints: descriptors.constraints.length,
    indexes: descriptors.indexes.length,
    enums: descriptors.enums.length,
    extensions: descriptors.extensions.length,
    triggers: descriptors.triggers.length,
    sequences: descriptors.sequences.length,
    unsupportedObjects: descriptors.unsupportedObjects.length
  };
}

export function capturePostMigrationProductionLineageEvidence(input: {
  environment: string;
  identity: SafeDatabaseIdentity;
  connectedDatabaseName: string;
  repositoryRevision: string;
  manifest: MigrationManifest;
  attestation: LineageAttestation;
  ledgerRows: MigrationLedgerRow[];
  catalog: CatalogSnapshot;
  controls: ReturnType<typeof assertPostMigrationProductionEvidenceControls>;
  captureOrdinal: 1 | 2;
  capturedAt?: Date;
}) {
  assertExactPostMigrationIdentity(input);
  if (!repositoryShaPattern.test(input.repositoryRevision)) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Post-migration Production evidence repository revision is invalid.'
    );
  }
  assertRetiredAttestationContract(input.attestation, input.controls);
  assertExactPostMigrationManifest(input.manifest, input.attestation);

  let ledgerResult: ReturnType<typeof verifyAttestedLedger>;
  try {
    ledgerResult = verifyAttestedLedger({
      rows: input.ledgerRows,
      manifest: input.manifest,
      attestation: input.attestation,
      mode: 'production-postflight',
      approvedPendingMigrations: [],
      historicalResolvedMigrationMode: 'retired-post-migration-evidence-capture'
    });
  } catch (error) {
    throw new LineageVerifierError(
      'LEDGER_MISMATCH',
      error instanceof Error ? error.message : 'Post-migration Production ledger verification failed.',
      { cause: error }
    );
  }
  const passwordResetRecords = ledgerResult.rows.filter(
    (record) => record.migrationName === PASSWORD_RESET_MIGRATION_NAME
  );
  if (
    ledgerResult.appliedRepositoryCount !== 16 ||
    ledgerResult.pending.length !== 0 ||
    passwordResetRecords.length !== 1 ||
    passwordResetRecords[0].checksum !== PASSWORD_RESET_MIGRATION_CHECKSUM ||
    passwordResetRecords[0].finishedAt === null ||
    passwordResetRecords[0].rolledBackAt !== null ||
    passwordResetRecords[0].appliedStepsCount !== 1 ||
    passwordResetRecords[0].logsState !== 'none' ||
    passwordResetRecords[0].logsDigest !== null
  ) {
    throw new LineageVerifierError(
      'LEDGER_MISMATCH',
      'Password-reset migration is not the exact canonical one-step successful application.'
    );
  }

  let postPasswordResetAssertions: ReturnType<typeof assertPostPasswordResetCatalog>;
  let historicalResolvedCatalog: ReturnType<typeof assertPilotAuthHistoricalResolvedCatalog>;
  let schema: ReturnType<typeof fingerprintCatalog>;
  try {
    postPasswordResetAssertions = assertPostPasswordResetCatalog(input.catalog);
    historicalResolvedCatalog = assertPilotAuthHistoricalResolvedCatalog(input.catalog);
    schema = fingerprintCatalog(input.catalog);
    if (input.catalog.unsupportedObjects.length !== 0) {
      throw new Error('Unexpected unsupported public relations are not permitted.');
    }
    if (
      historicalResolvedCatalog.assertionsDigest !==
      input.attestation.historicalResolvedMigrations[0].observedCurrentSchema
        .catalogAssertionsDigest
    ) {
      throw new Error('Pilot-auth historical catalog assertions differ from retained evidence.');
    }
  } catch (error) {
    throw new LineageVerifierError(
      'SCHEMA_MISMATCH',
      error instanceof Error ? error.message : 'Post-migration Production schema verification failed.',
      { cause: error }
    );
  }

  const catalogDescriptorDigest = createHash('sha256')
    .update(canonicalJson(schema.canonical))
    .digest('hex');
  if (catalogDescriptorDigest !== schema.fingerprint) {
    throw new LineageVerifierError(
      'SCHEMA_MISMATCH',
      'Catalog descriptor digest differs from schema fingerprint v2.'
    );
  }

  const deterministicEvidence = {
    evidenceVersion: POST_MIGRATION_PRODUCTION_EVIDENCE_VERSION,
    operationPurpose: POST_MIGRATION_PRODUCTION_EVIDENCE_PURPOSE,
    attestationLifecycleExpected: 'retired' as const,
    migrationStateExpected: {
      repositoryMigrations: 16,
      appliedRepositoryMigrations: 16,
      pendingRepositoryMigrations: 0
    },
    schemaState: 'post-password-reset' as const,
    fingerprintSource: 'production-read-only-capture' as const,
    environment: 'production' as const,
    connectedIdentity: {
      databaseName: POST_MIGRATION_PRODUCTION_DATABASE_NAME,
      branchId: POST_MIGRATION_PRODUCTION_BRANCH_ID,
      databaseFingerprint: POST_MIGRATION_PRODUCTION_DATABASE_FINGERPRINT
    },
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
    attestation: {
      version: input.attestation.version,
      id: input.attestation.attestationId,
      status: input.attestation.status,
      retainedHistoricalCaptureCount:
        input.attestation.pilotStageCompensatingControl!.captures.length,
      retainedHumanApprovalCount: input.attestation.approvals.length,
      postMigrationFingerprint: null,
      postMigrationEvidence: null,
      newHumanApprovalRequiredBeforeAmendment: true
    },
    ledger: {
      normalizationVersion: 'adr-0024-migration-record-normalization/v1' as const,
      totalRecords: ledgerResult.rows.length,
      records: ledgerResult.rows,
      appliedRepositoryMigrations: ledgerResult.appliedRepositoryCount,
      pendingMigrations: ledgerResult.pending,
      ordinaryChecksumDivergenceResults: ledgerResult.repositoryChecksumDivergences,
      historicalResolvedMigrationResults: ledgerResult.historicalResolvedMigrations,
      finalRepositoryMigration: {
        expectedChecksum: PASSWORD_RESET_MIGRATION_CHECKSUM,
        recordCount: passwordResetRecords.length,
        lifecycleResult: 'exact-canonical-one-step-success' as const,
        record: passwordResetRecords[0]
      }
    },
    schema: {
      fingerprintVersion: schema.version,
      fingerprint: schema.fingerprint,
      catalogDescriptorDigestAlgorithm: 'sha256-canonical-json' as const,
      catalogDescriptorDigest,
      catalogDescriptors: schema.canonical,
      catalogCounts: catalogCounts(schema.canonical),
      postMigrationAssertions: postPasswordResetAssertions,
      historicalResolvedMigrationCatalog: historicalResolvedCatalog,
      unsupportedObjects: schema.canonical.unsupportedObjects
    }
  };
  const deterministicEvidenceDigest = createHash('sha256')
    .update(canonicalJson(deterministicEvidence))
    .digest('hex');
  const evidence = {
    evidenceVersion: POST_MIGRATION_PRODUCTION_EVIDENCE_VERSION,
    operationPurpose: POST_MIGRATION_PRODUCTION_EVIDENCE_PURPOSE,
    captureOrdinal: input.captureOrdinal,
    logicalArtifactReference:
      `ADR0024/${input.controls.changeId}/capture-${input.captureOrdinal}.json`,
    deterministicEvidence,
    deterministicEvidenceDigest,
    capturedAt: (input.capturedAt ?? new Date()).toISOString()
  };
  assertPostMigrationProductionLineageEvidence(evidence);
  return evidence;
}

export function assertPostMigrationProductionLineageEvidence(
  value: unknown
) {
  if (!value || typeof value !== 'object') {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Evidence does not satisfy the post-migration Production contract.'
    );
  }
  const evidence = value as {
    evidenceVersion: string;
    operationPurpose: string;
    deterministicEvidence: {
      evidenceVersion: string;
      operationPurpose: string;
      attestationLifecycleExpected: string;
      migrationStateExpected: {
        repositoryMigrations: number;
        appliedRepositoryMigrations: number;
        pendingRepositoryMigrations: number;
      };
      schemaState: string;
      fingerprintSource: string;
      environment: string;
      connectedIdentity: {
        databaseName: string;
        branchId: string;
        databaseFingerprint: string;
      };
      attestation: {
        version: string;
        status: string;
        postMigrationFingerprint: null;
        postMigrationEvidence: null;
        newHumanApprovalRequiredBeforeAmendment: boolean;
      };
      schema: {
        fingerprintVersion: string;
        catalogDescriptors: ReturnType<typeof fingerprintCatalog>['canonical'];
        catalogDescriptorDigest: string;
        fingerprint: string;
      };
    };
    deterministicEvidenceDigest: string;
  };
  if (
    evidence.evidenceVersion !== POST_MIGRATION_PRODUCTION_EVIDENCE_VERSION ||
    evidence.operationPurpose !== POST_MIGRATION_PRODUCTION_EVIDENCE_PURPOSE ||
    evidence.deterministicEvidence.evidenceVersion !==
      POST_MIGRATION_PRODUCTION_EVIDENCE_VERSION ||
    evidence.deterministicEvidence.operationPurpose !==
      POST_MIGRATION_PRODUCTION_EVIDENCE_PURPOSE ||
    evidence.deterministicEvidence.attestationLifecycleExpected !== 'retired' ||
    canonicalJson(evidence.deterministicEvidence.migrationStateExpected) !==
      canonicalJson({
        repositoryMigrations: 16,
        appliedRepositoryMigrations: 16,
        pendingRepositoryMigrations: 0
      }) ||
    evidence.deterministicEvidence.schemaState !== 'post-password-reset' ||
    evidence.deterministicEvidence.fingerprintSource !== 'production-read-only-capture' ||
    evidence.deterministicEvidence.environment !== 'production' ||
    evidence.deterministicEvidence.connectedIdentity.databaseName !==
      POST_MIGRATION_PRODUCTION_DATABASE_NAME ||
    evidence.deterministicEvidence.connectedIdentity.branchId !==
      POST_MIGRATION_PRODUCTION_BRANCH_ID ||
    evidence.deterministicEvidence.connectedIdentity.databaseFingerprint !==
      POST_MIGRATION_PRODUCTION_DATABASE_FINGERPRINT ||
    evidence.deterministicEvidence.attestation.version !== ATTESTATION_VERSION ||
    evidence.deterministicEvidence.attestation.status !== 'retired' ||
    evidence.deterministicEvidence.attestation.postMigrationFingerprint !== null ||
    evidence.deterministicEvidence.attestation.postMigrationEvidence !== null ||
    !evidence.deterministicEvidence.attestation.newHumanApprovalRequiredBeforeAmendment ||
    evidence.deterministicEvidence.schema.fingerprintVersion !==
      'clada-postgres-schema-fingerprint/v2' ||
    evidence.deterministicEvidence.schema.catalogDescriptors.version !==
      'clada-postgres-schema-fingerprint/v2'
  ) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'Evidence does not satisfy the post-migration Production contract.'
    );
  }
  const descriptors = evidence.deterministicEvidence.schema.catalogDescriptors;
  const descriptorDigest = createHash('sha256')
    .update(canonicalJson(descriptors))
    .digest('hex');
  if (
    descriptorDigest !== evidence.deterministicEvidence.schema.catalogDescriptorDigest ||
    descriptorDigest !== evidence.deterministicEvidence.schema.fingerprint
  ) {
    throw new LineageVerifierError(
      'SCHEMA_MISMATCH',
      'Evidence catalog descriptors do not substantiate schema fingerprint v2.'
    );
  }
  const digest = createHash('sha256')
    .update(canonicalJson(evidence.deterministicEvidence))
    .digest('hex');
  if (digest !== evidence.deterministicEvidenceDigest) {
    throw new LineageVerifierError(
      'INTERNAL_ERROR',
      'Post-migration deterministic evidence digest is invalid.'
    );
  }
  return evidence;
}

export function assertRepeatedPostMigrationProductionLineageEvidence(
  first: ReturnType<typeof capturePostMigrationProductionLineageEvidence>,
  second: ReturnType<typeof capturePostMigrationProductionLineageEvidence>
) {
  assertPostMigrationProductionLineageEvidence(first);
  assertPostMigrationProductionLineageEvidence(second);
  if (
    first.captureOrdinal !== 1 ||
    second.captureOrdinal !== 2 ||
    first.deterministicEvidenceDigest !== second.deterministicEvidenceDigest ||
    canonicalJson(first.deterministicEvidence) !== canonicalJson(second.deterministicEvidence)
  ) {
    throw new LineageVerifierError(
      'INTERNAL_ERROR',
      'Repeated post-migration Production evidence differs; retain diagnostics and stop.'
    );
  }
  return {
    result: 'matched' as const,
    deterministicEvidenceDigest: first.deterministicEvidenceDigest,
    comparedPayload: 'canonical-deterministic-evidence' as const,
    excludedVariableFields: [
      'captureOrdinal',
      'logicalArtifactReference',
      'capturedAt',
      'rawArtifactSha256'
    ] as const,
    firstCapturedAt: first.capturedAt,
    secondCapturedAt: second.capturedAt
  };
}
