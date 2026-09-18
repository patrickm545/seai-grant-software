import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  assertDatabaseOperationAllowed,
  formatDatabaseSafetyError,
  type ApplicationEnvironment
} from '../lib/database-safety';
import {
  AttestationValidationError,
  type LineageAttestation
} from '../lib/lineage-attestation';
import { verifyRepositoryEvidenceReferences } from '../lib/lineage-evidence-references';
import {
  assertVerifierEvidenceSecretFree,
  exitCodeFor,
  LineageVerifierError,
  VERIFIER_EXIT_CODES
} from '../lib/lineage-verifier';
import {
  verifyMigrationManifest,
  type MigrationManifest
} from '../lib/migration-manifest';
import {
  assertExactPostMigrationManifest,
  assertPostMigrationProductionEvidenceControls,
  assertPostMigrationRetiredAttestation,
  assertRepeatedPostMigrationProductionLineageEvidence,
  capturePostMigrationProductionLineageEvidence,
  POST_MIGRATION_PRODUCTION_DUAL_CAPTURE_VERSION,
  POST_MIGRATION_PRODUCTION_EVIDENCE_PURPOSE
} from '../lib/post-migration-production-evidence';
import {
  readCatalogSnapshot,
  readConnectedDatabaseIdentity,
  readMigrationLedger
} from '../lib/postgres-catalog';
import {
  ProductionEvidenceStageError,
  runProductionEvidenceStage,
  safeProductionEvidenceStageDiagnostic,
  type ProductionEvidenceStage
} from '../lib/production-evidence-diagnostics';

const repositoryRoot = resolve(__dirname, '..');
const manifestPath = resolve(repositoryRoot, 'prisma', 'migration-manifest.json');
const attestationPath = resolve(
  repositoryRoot,
  'prisma',
  'lineage-attestations',
  'adr-0024-production.json'
);

function readFixedJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
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
    process.env.VERCEL === '1' &&
    Boolean(vercelRevision && /^[a-f0-9]{40}$/.test(vercelRevision));
  try {
    verifyMigrationManifest(repositoryRoot, manifest, {
      byteSource: isTrustedVercelCheckout ? 'working-tree' : 'git'
    });
  } catch {
    throw new LineageVerifierError(
      'INVENTORY_MISMATCH',
      'Repository migration inventory differs from the approved manifest.'
    );
  }
}

function safeMessage(error: unknown) {
  if (error instanceof LineageVerifierError || error instanceof AttestationValidationError) {
    return error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-database-url]');
  }
  return 'Post-migration Production evidence verification failed safely.';
}

type ReadStages = {
  transaction: ProductionEvidenceStage;
  readOnlySetup: ProductionEvidenceStage;
  connectedIdentity: ProductionEvidenceStage;
  migrationLedger: ProductionEvidenceStage;
  catalog: ProductionEvidenceStage;
};

async function readPostMigrationDatabaseState(stages: ReadStages) {
  const prisma = new PrismaClient();
  try {
    return await runProductionEvidenceStage(
      stages.transaction,
      'repeatable-read transaction completes without mutation',
      () =>
        prisma.$transaction(
          async (transaction) => {
            await runProductionEvidenceStage(
              stages.readOnlySetup,
              'repeatable-read transaction is set read only before evidence queries',
              () => transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY')
            );
            const identity = await runProductionEvidenceStage(
              stages.connectedIdentity,
              'connected database identity query returns exactly one guarded database',
              () => readConnectedDatabaseIdentity(transaction)
            );
            const ledgerRows = await runProductionEvidenceStage(
              stages.migrationLedger,
              'fixed migration-ledger query returns canonical rows',
              () => readMigrationLedger(transaction)
            );
            const catalog = await runProductionEvidenceStage(
              stages.catalog,
              'fixed public catalog query set returns canonical metadata',
              () => readCatalogSnapshot(transaction)
            );
            return { identity, ledgerRows, catalog };
          },
          { isolationLevel: 'RepeatableRead', timeout: 30_000 }
        )
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (process.argv.length !== 2) {
    throw new LineageVerifierError(
      'UNSAFE_CONFIGURATION',
      'The fixed post-migration Production evidence script accepts no arguments.'
    );
  }
  const environment = process.env.APP_ENV?.trim().toLowerCase() as ApplicationEnvironment;
  const guarded = await runProductionEvidenceStage(
    'post-migration-guarded-identity-configuration',
    'environment, database, branch and URL-derived fingerprint match the exact Production identity',
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
    'post-migration-manifest-verification',
    'repository inventory is the exact approved 16-migration immutable manifest',
    () => {
      const approved = readFixedJson<MigrationManifest>(manifestPath);
      verifyApprovedManifest(approved);
      return approved;
    }
  );
  const attestation = await runProductionEvidenceStage(
    'post-migration-retired-attestation-verification',
    'fixed retired v6 attestation and historical repository evidence remain exact',
    () => {
      const retired = readFixedJson<LineageAttestation>(attestationPath);
      assertPostMigrationRetiredAttestation(retired);
      assertExactPostMigrationManifest(manifest, retired);
      verifyRepositoryEvidenceReferences(repositoryRoot, retired);
      return retired;
    }
  );
  const controls = await runProductionEvidenceStage(
    'post-migration-operational-controls',
    'post-migration change family, operator, governance and restore controls are exact',
    () =>
      assertPostMigrationProductionEvidenceControls({
        governanceMode: process.env.POST_MIGRATION_PRODUCTION_EVIDENCE_GOVERNANCE_MODE as
          | 'standard-independent-human'
          | 'pilot-stage-compensating-control'
          | undefined,
        changeId: process.env.POST_MIGRATION_PRODUCTION_EVIDENCE_CHANGE_ID,
        operator: process.env.POST_MIGRATION_PRODUCTION_EVIDENCE_OPERATOR,
        independentReviewer: process.env.POST_MIGRATION_PRODUCTION_EVIDENCE_REVIEWER,
        restorePointReference:
          process.env.POST_MIGRATION_PRODUCTION_RESTORE_POINT_REFERENCE,
        pilotStageAccountabilityAcknowledgement:
          process.env.POST_MIGRATION_PRODUCTION_EVIDENCE_PILOT_ACCOUNTABILITY_ACKNOWLEDGEMENT
      })
  );
  const revision = repositoryRevision();
  const firstState = await readPostMigrationDatabaseState({
    transaction: 'post-migration-first-transaction',
    readOnlySetup: 'post-migration-first-read-only-setup',
    connectedIdentity: 'post-migration-first-connected-identity',
    migrationLedger: 'post-migration-first-migration-ledger',
    catalog: 'post-migration-first-catalog'
  });
  const first = await runProductionEvidenceStage(
    'post-migration-first-evidence-generation',
    'first retired-attestation ledger, post-reset schema and identity evidence is exact',
    () =>
      capturePostMigrationProductionLineageEvidence({
        environment: guarded.appEnvironment,
        identity: guarded.identity,
        connectedDatabaseName: firstState.identity.database_name,
        repositoryRevision: revision,
        manifest,
        attestation,
        ledgerRows: firstState.ledgerRows,
        catalog: firstState.catalog,
        controls,
        captureOrdinal: 1
      })
  );
  const secondState = await readPostMigrationDatabaseState({
    transaction: 'post-migration-second-transaction',
    readOnlySetup: 'post-migration-second-read-only-setup',
    connectedIdentity: 'post-migration-second-connected-identity',
    migrationLedger: 'post-migration-second-migration-ledger',
    catalog: 'post-migration-second-catalog'
  });
  const second = await runProductionEvidenceStage(
    'post-migration-second-evidence-generation',
    'second retired-attestation ledger, post-reset schema and identity evidence is exact',
    () =>
      capturePostMigrationProductionLineageEvidence({
        environment: guarded.appEnvironment,
        identity: guarded.identity,
        connectedDatabaseName: secondState.identity.database_name,
        repositoryRevision: revision,
        manifest,
        attestation,
        ledgerRows: secondState.ledgerRows,
        catalog: secondState.catalog,
        controls,
        captureOrdinal: 2
      })
  );
  const deterministicComparison = await runProductionEvidenceStage(
    'post-migration-deterministic-comparison',
    'both complete post-migration deterministic evidence payloads match exactly',
    () => assertRepeatedPostMigrationProductionLineageEvidence(first, second)
  );
  const evidence = {
    version: POST_MIGRATION_PRODUCTION_DUAL_CAPTURE_VERSION,
    operationPurpose: POST_MIGRATION_PRODUCTION_EVIDENCE_PURPOSE,
    captures: [first, second],
    deterministicComparison
  };
  await runProductionEvidenceStage(
    'post-migration-secret-free-validation',
    'complete dual-capture output contains no credential, URL or secret-bearing field',
    () => assertVerifierEvidenceSecretFree(evidence)
  );
  const serialized = await runProductionEvidenceStage(
    'post-migration-evidence-serialization',
    'complete dual-capture evidence serializes as JSON',
    () => JSON.stringify(evidence, null, 2)
  );
  process.stdout.write(`${serialized}\n`);
  return 0;
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
        console.error(
          `${formatted.split(':', 1)[0]}: ${stage}; database safety guard rejected the operation.`
        );
        process.exitCode = VERIFIER_EXIT_CODES.UNSAFE_CONFIGURATION;
        return;
      }
      console.error(`INTERNAL_ERROR: ${stage}; ${safeMessage(cause)}`);
      process.exitCode = VERIFIER_EXIT_CODES.INTERNAL_ERROR;
      return;
    }
    if (error instanceof LineageVerifierError) {
      console.error(`${error.code}: ${safeMessage(error)}`);
      process.exitCode = exitCodeFor(error);
      return;
    }
    console.error(`INTERNAL_ERROR: ${safeMessage(error)}`);
    process.exitCode = VERIFIER_EXIT_CODES.INTERNAL_ERROR;
  });
