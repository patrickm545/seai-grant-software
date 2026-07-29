import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  assertDatabaseOperationAllowed,
  formatDatabaseSafetyError,
  type ApplicationEnvironment
} from '../lib/database-safety';
import {
  assertVerifierEvidenceSecretFree,
  assertDeliberateProductionControls,
  exitCodeFor,
  LineageVerifierError,
  VERIFIER_EXIT_CODES,
  verifyLineage,
  type VerifierMode
} from '../lib/lineage-verifier';
import {
  AttestationValidationError,
  validateLineageAttestation,
  type LineageAttestation
} from '../lib/lineage-attestation';
import {
  generateMigrationManifest,
  verifyImmutableMigrationHistory,
  verifyMigrationManifest,
  type MigrationManifest
} from '../lib/migration-manifest';
import {
  readCatalogSnapshot,
  readConnectedDatabaseIdentity,
  readMigrationLedger
} from '../lib/postgres-catalog';
import {
  assertRepeatedProductionLineageEvidence,
  assertProductionEvidenceControls,
  captureProductionLineageEvidence
} from '../lib/production-lineage-evidence';
import {
  ProductionEvidenceStageError,
  runProductionEvidenceStage,
  safeProductionEvidenceStageDiagnostic,
  type ProductionEvidenceStage
} from '../lib/production-evidence-diagnostics';
import { assertNamedCatalog, fingerprintCatalog, type SchemaProfile } from '../lib/schema-fingerprint';

const repositoryRoot = resolve(__dirname, '..');
const manifestPath = resolve(repositoryRoot, 'prisma', 'migration-manifest.json');
const attestationPath = resolve(
  repositoryRoot,
  'prisma',
  'lineage-attestations',
  'adr-0024-production.json'
);
const modes = new Set<VerifierMode>([
  'strict-status',
  'strict-preflight',
  'strict-postflight',
  'production-status',
  'production-preflight',
  'production-postflight'
]);

function readFixedJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function verifyRepositoryEvidenceReferences(attestation: LineageAttestation) {
  for (const reference of attestation.evidenceReferences) {
    if (!reference.startsWith('docs/')) continue;
    const evidencePath = resolve(repositoryRoot, reference);
    if (!existsSync(evidencePath)) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        `Repository evidence reference does not exist: ${reference}`
      );
    }
  }
}

function safeMessage(error: unknown) {
  if (error instanceof LineageVerifierError || error instanceof AttestationValidationError) {
    return error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-database-url]');
  }
  return 'Migration lineage verification failed safely.';
}

function repositoryRevision() {
  const supplied = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (supplied && /^[a-f0-9]{40}$/.test(supplied)) return supplied;
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  }).trim();
}

function verifyApprovedManifest(manifest: MigrationManifest) {
  const vercelRevision = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  const isTrustedVercelCheckout =
    process.env.VERCEL === '1' && Boolean(vercelRevision && /^[a-f0-9]{40}$/.test(vercelRevision));
  try {
    return verifyMigrationManifest(repositoryRoot, manifest, {
      byteSource: isTrustedVercelCheckout ? 'working-tree' : 'git'
    });
  } catch {
    throw new LineageVerifierError(
      'INVENTORY_MISMATCH',
      'Repository migration inventory differs from the approved manifest.'
    );
  }
}

type DatabaseReadStages = {
  transaction: ProductionEvidenceStage;
  readOnlySetup: ProductionEvidenceStage;
  connectedIdentity: ProductionEvidenceStage;
  migrationLedger: ProductionEvidenceStage;
  catalog: ProductionEvidenceStage;
};

async function readDatabaseState(stages?: DatabaseReadStages) {
  const prisma = new PrismaClient();
  try {
    const transaction = () => prisma.$transaction(
      async (transaction) => {
        const identity = stages
          ? await runProductionEvidenceStage(
              stages.connectedIdentity,
              'connected database identity query returns exactly one guarded database',
              async () => {
                await runProductionEvidenceStage(
                  stages.readOnlySetup,
                  'repeatable-read transaction is set read only before evidence queries',
                  () => transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY')
                );
                return readConnectedDatabaseIdentity(transaction);
              }
            )
          : await (async () => {
              await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY');
              return readConnectedDatabaseIdentity(transaction);
            })();
        const ledgerRows = stages
          ? await runProductionEvidenceStage(
              stages.migrationLedger,
              'fixed migration-ledger query returns canonical rows',
              () => readMigrationLedger(transaction)
            )
          : await readMigrationLedger(transaction);
        const catalog = stages
          ? await runProductionEvidenceStage(
              stages.catalog,
              'fixed public catalog query set returns canonical metadata',
              () => readCatalogSnapshot(transaction)
            )
          : await readCatalogSnapshot(transaction);
        return { identity, ledgerRows, catalog };
      },
      { isolationLevel: 'RepeatableRead', timeout: 30_000 }
    );
    return stages
      ? await runProductionEvidenceStage(
          stages.transaction,
          'repeatable-read transaction completes without mutation',
          transaction
        )
      : await transaction();
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'manifest-generate') {
    const generated = generateMigrationManifest(repositoryRoot);
    process.stdout.write(`${JSON.stringify(generated, null, 2)}\n`);
    return 0;
  }
  if (command === 'manifest-verify') {
    const approved = readFixedJson<MigrationManifest>(manifestPath);
    verifyApprovedManifest(approved);
    console.log(`Migration manifest verified: ${approved.manifestHash}`);
    return 0;
  }
  if (command === 'history-verify-base') {
    const result = verifyImmutableMigrationHistory(repositoryRoot);
    console.log(
      `Historical migration immutability verified: base=${result.baseRef} count=${result.verifiedHistoricalMigrations}`
    );
    return 0;
  }
  if (command === 'attestation-verify') {
    const attestation = readFixedJson<LineageAttestation>(attestationPath);
    validateLineageAttestation(attestation);
    verifyRepositoryEvidenceReferences(attestation);
    console.log(`ADR-0024 attestation is structurally valid and status=${attestation.status}.`);
    return attestation.status === 'active' ? 0 : VERIFIER_EXIT_CODES.ATTESTATION_INACTIVE;
  }
  if (command === 'production-evidence-capture') {
    const environment = process.env.APP_ENV?.trim().toLowerCase() as ApplicationEnvironment;
    const guarded = await runProductionEvidenceStage(
      'guarded-identity-configuration',
      'environment and URL-derived fingerprint match the approved Production identity',
      () =>
        assertDatabaseOperationAllowed({
          operation: 'read-only-diagnostic',
          requiredApplicationEnvironment: 'production',
          appEnvironment: environment,
          databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
          databaseUrl: process.env.DATABASE_URL,
          expectedFingerprint: process.env.DATABASE_FINGERPRINT,
          productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
          branchId: process.env.DATABASE_BRANCH_ID
        })
    );
    const manifest = await runProductionEvidenceStage(
      'manifest-verification',
      'repository migration inventory matches the approved immutable manifest',
      () => {
        const approved = readFixedJson<MigrationManifest>(manifestPath);
        verifyApprovedManifest(approved);
        return approved;
      }
    );
    const attestation = await runProductionEvidenceStage(
      'pending-attestation-verification',
      'fixed pending attestation and repository evidence references are structurally valid',
      () => {
        const pending = readFixedJson<LineageAttestation>(attestationPath);
        verifyRepositoryEvidenceReferences(pending);
        return pending;
      }
    );
    const controls = await runProductionEvidenceStage(
      'operational-controls',
      'approved change, operator, governance and restore controls are exact',
      () =>
        assertProductionEvidenceControls({
          governanceMode: process.env.PRODUCTION_EVIDENCE_GOVERNANCE_MODE as
            | 'standard-independent-human'
            | 'pilot-stage-compensating-control'
            | undefined,
          changeId: process.env.PRODUCTION_EVIDENCE_CHANGE_ID,
          operator: process.env.PRODUCTION_EVIDENCE_OPERATOR,
          independentReviewer: process.env.PRODUCTION_EVIDENCE_REVIEWER,
          restorePointReference: process.env.PRODUCTION_RESTORE_POINT_REFERENCE,
          pilotStageAccountabilityAcknowledgement:
            process.env.PRODUCTION_EVIDENCE_PILOT_ACCOUNTABILITY_ACKNOWLEDGEMENT
        })
    );
    const firstState = await readDatabaseState({
      transaction: 'first-transaction',
      readOnlySetup: 'first-read-only-setup',
      connectedIdentity: 'first-connected-identity',
      migrationLedger: 'first-migration-ledger',
      catalog: 'first-catalog'
    });
    const firstEvidence = await runProductionEvidenceStage(
      'first-evidence-generation',
      'first ledger, schema and identity evidence satisfies ADR-0024',
      () =>
        captureProductionLineageEvidence({
          environment: guarded.appEnvironment,
          identity: guarded.identity,
          connectedDatabaseName: firstState.identity.database_name,
          repositoryRevision: repositoryRevision(),
          manifest,
          attestation,
          ledgerRows: firstState.ledgerRows,
          catalog: firstState.catalog,
          controls
        })
    );
    const secondState = await readDatabaseState({
      transaction: 'second-transaction',
      readOnlySetup: 'second-read-only-setup',
      connectedIdentity: 'second-connected-identity',
      migrationLedger: 'second-migration-ledger',
      catalog: 'second-catalog'
    });
    const secondEvidence = await runProductionEvidenceStage(
      'second-evidence-generation',
      'second ledger, schema and identity evidence satisfies ADR-0024',
      () =>
        captureProductionLineageEvidence({
          environment: guarded.appEnvironment,
          identity: guarded.identity,
          connectedDatabaseName: secondState.identity.database_name,
          repositoryRevision: firstEvidence.repositoryRevision,
          manifest,
          attestation,
          ledgerRows: secondState.ledgerRows,
          catalog: secondState.catalog,
          controls
        })
    );
    const repeatCapture = await runProductionEvidenceStage(
      'deterministic-comparison',
      'both complete deterministic captures match exactly',
      () => assertRepeatedProductionLineageEvidence(firstEvidence, secondEvidence)
    );
    const evidence = { ...firstEvidence, repeatCapture };
    await runProductionEvidenceStage(
      'secret-free-validation',
      'complete evidence contains no credential, URL, token or secret-like field',
      () => assertVerifierEvidenceSecretFree(evidence)
    );
    const serialized = await runProductionEvidenceStage(
      'evidence-serialization',
      'complete evidence serializes as JSON',
      () => JSON.stringify(evidence, null, 2)
    );
    process.stdout.write(`${serialized}\n`);
    return 0;
  }
  if (command === 'schema-fingerprint') {
    const profile = process.argv[3] as SchemaProfile;
    if (!['pre-password-reset', 'post-password-reset', 'fresh-head'].includes(profile)) {
      throw new LineageVerifierError('UNSAFE_CONFIGURATION', 'A fixed schema profile is required.');
    }
    const appEnvironment = process.env.APP_ENV?.trim().toLowerCase() as ApplicationEnvironment;
    const guarded = assertDatabaseOperationAllowed({
      operation: 'read-only-diagnostic',
      appEnvironment,
      databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
      databaseUrl: process.env.DATABASE_URL,
      expectedFingerprint: process.env.DATABASE_FINGERPRINT,
      productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
      branchId: process.env.DATABASE_BRANCH_ID
    });
    const state = await readDatabaseState();
    if (state.identity.database_name !== guarded.identity.databaseName) {
      throw new LineageVerifierError('IDENTITY_MISMATCH', 'Connected database identity differs.');
    }
    const assertions = assertNamedCatalog(state.catalog, profile);
    const fingerprint = fingerprintCatalog(state.catalog);
    const evidence = {
      version: fingerprint.version,
      profile,
      environment: guarded.appEnvironment,
      databaseFingerprint: guarded.identity.fingerprint,
      fingerprint: fingerprint.fingerprint,
      namedAssertions: assertions,
      timestamp: new Date().toISOString()
    };
    assertVerifierEvidenceSecretFree(evidence);
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
    return 0;
  }
  if (!modes.has(command as VerifierMode)) {
    throw new LineageVerifierError('UNSAFE_CONFIGURATION', 'Unknown fixed migration verifier mode.');
  }
  const mode = command as VerifierMode;
  const productionMode = mode.startsWith('production-');
  const environment = process.env.APP_ENV?.trim().toLowerCase() as ApplicationEnvironment;
  const guarded = assertDatabaseOperationAllowed({
    operation: 'migration-status',
    requiredApplicationEnvironment: productionMode ? 'production' : undefined,
    appEnvironment: environment,
    databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
    databaseUrl: process.env.DATABASE_URL,
    expectedFingerprint: process.env.DATABASE_FINGERPRINT,
    productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: process.env.DATABASE_BRANCH_ID
  });
  const manifest = readFixedJson<MigrationManifest>(manifestPath);
  verifyApprovedManifest(manifest);
  const attestation = productionMode
    ? readFixedJson<LineageAttestation>(attestationPath)
    : undefined;
  if (attestation) {
    validateLineageAttestation(attestation, { requireActive: true });
    verifyRepositoryEvidenceReferences(attestation);
    if (mode === 'production-preflight') {
      assertDeliberateProductionControls({
        attestationId: process.env.ADR0024_ATTESTATION_ID,
        acknowledgement: process.env.ACKNOWLEDGE_PRODUCTION_MIGRATION,
        changeId: process.env.PRODUCTION_MIGRATION_CHANGE_ID,
        restorePointConfirmation: process.env.PRODUCTION_RESTORE_POINT_CONFIRMED
      });
    }
  }
  const state = await readDatabaseState();
  const evidence = verifyLineage({
    mode,
    environment: guarded.appEnvironment,
    identity: guarded.identity,
    connectedDatabaseName: state.identity.database_name,
    repositoryBaseline: repositoryRevision(),
    manifest,
    attestation,
    ledgerRows: state.ledgerRows,
    catalog: state.catalog,
    changeId: process.env.PRODUCTION_MIGRATION_CHANGE_ID
  });
  assertVerifierEvidenceSecretFree(evidence);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  console.log(
    evidence.finalDecision === 'verified-clean'
      ? 'Migration lineage verifier: verified clean.'
      : 'Migration lineage verifier: verified lineage with pending migrations; deployment remains blocked.'
  );
  return evidence.finalDecision === 'verified-pending-blocked'
    ? VERIFIER_EXIT_CODES.VERIFIED_PENDING_BLOCKED
    : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    if (error instanceof ProductionEvidenceStageError) {
      const cause = error.cause;
      const stage = safeProductionEvidenceStageDiagnostic(error);
      if (cause instanceof AttestationValidationError) {
        const code =
          cause.code === 'ATTESTATION_INACTIVE'
            ? VERIFIER_EXIT_CODES.ATTESTATION_INACTIVE
            : cause.code === 'ATTESTATION_EXPIRED'
              ? VERIFIER_EXIT_CODES.ATTESTATION_EXPIRED
              : VERIFIER_EXIT_CODES.UNSAFE_CONFIGURATION;
        console.error(`${cause.code}: ${stage}; ${safeMessage(cause)}`);
        process.exitCode = code;
        return;
      }
      if (cause instanceof LineageVerifierError) {
        console.error(`${cause.code}: ${stage}; ${safeMessage(cause)}`);
        process.exitCode = exitCodeFor(cause);
        return;
      }
      const formatted = formatDatabaseSafetyError(cause);
      if (!formatted.startsWith('DB_OPERATION_NOT_ALLOWED: Database operation failed safely.')) {
        console.error(`${formatted.split(':', 1)[0]}: ${stage}; database safety guard rejected the operation.`);
        process.exitCode = VERIFIER_EXIT_CODES.UNSAFE_CONFIGURATION;
        return;
      }
      console.error(`INTERNAL_ERROR: ${stage}; ${safeMessage(cause)}`);
      process.exitCode = VERIFIER_EXIT_CODES.INTERNAL_ERROR;
      return;
    }
    if (error instanceof AttestationValidationError) {
      const code =
        error.code === 'ATTESTATION_INACTIVE'
          ? VERIFIER_EXIT_CODES.ATTESTATION_INACTIVE
          : error.code === 'ATTESTATION_EXPIRED'
            ? VERIFIER_EXIT_CODES.ATTESTATION_EXPIRED
            : VERIFIER_EXIT_CODES.UNSAFE_CONFIGURATION;
      console.error(`${error.code}: ${safeMessage(error)}`);
      process.exitCode = code;
      return;
    }
    if (error instanceof LineageVerifierError) {
      console.error(`${error.code}: ${safeMessage(error)}`);
      process.exitCode = exitCodeFor(error);
      return;
    }
    const formatted = formatDatabaseSafetyError(error);
    if (!formatted.startsWith('DB_OPERATION_NOT_ALLOWED: Database operation failed safely.')) {
      console.error(formatted);
      process.exitCode = VERIFIER_EXIT_CODES.UNSAFE_CONFIGURATION;
      return;
    }
    console.error(`INTERNAL_ERROR: ${safeMessage(error)}`);
    process.exitCode = VERIFIER_EXIT_CODES.INTERNAL_ERROR;
  });
