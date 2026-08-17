import {
  assertDatabaseOperationAllowed,
  formatDatabaseSafetyError,
  formatSafeDatabaseIdentity,
  getDatabaseIdentity,
  type ApplicationEnvironment,
  type DatabaseOperation
} from '../lib/database-safety';
import {
  launchFixedLineageVerifier,
  launchFixedPrismaCommand,
  launchFixedSeed,
  type FixedPrismaCommand
} from '../lib/fixed-database-command-launcher';
import {
  classifyVerifierExit,
  productionPendingBlockEvidence
} from '../lib/verifier-command-policy';
import type { VerifierMode } from '../lib/lineage-verifier';

type CommandDefinition = {
  operation: DatabaseOperation;
  prismaCommand?: FixedPrismaCommand;
  seed?: true;
  productionMigrationPath?: boolean;
  resetAcknowledgement?: boolean;
  requiredEnvironment?: ApplicationEnvironment;
};

const commandName = process.argv[2];
const commands: Record<string, CommandDefinition> = {
  status: { operation: 'migration-status' },
  'migrate-preview': {
    operation: 'migration-deploy',
    prismaCommand: 'migrate-deploy',
    requiredEnvironment: 'preview'
  },
  'migrate-test': {
    operation: 'migration-deploy',
    prismaCommand: 'migrate-deploy',
    requiredEnvironment: 'test'
  },
  'migrate-development': {
    operation: 'migration-dev',
    prismaCommand: 'migrate-dev',
    requiredEnvironment: 'development'
  },
  'migrate-production': {
    operation: 'migration-deploy',
    prismaCommand: 'migrate-deploy',
    productionMigrationPath: true,
    requiredEnvironment: 'production'
  },
  'seed-development': {
    operation: 'seed',
    seed: true,
    requiredEnvironment: 'development'
  },
  'seed-test': {
    operation: 'seed',
    seed: true,
    requiredEnvironment: 'test'
  },
  reset: { operation: 'reset', prismaCommand: 'migrate-reset', resetAcknowledgement: true }
};

function exitWithError(error: unknown): never {
  console.error(formatDatabaseSafetyError(error));
  process.exit(1);
}

if (commandName === 'fingerprint') {
  try {
    const identity = getDatabaseIdentity(process.env.DATABASE_URL, {
      branchId: process.env.DATABASE_BRANCH_ID
    });
    console.log(formatSafeDatabaseIdentity(identity));
    process.exit(0);
  } catch (error) {
    exitWithError(error);
  }
}

const definition = commands[commandName];
if (!definition) {
  console.error('DB_OPERATION_NOT_ALLOWED: Unknown guarded database command.');
  process.exit(1);
}

if (definition.resetAcknowledgement && process.env.ACKNOWLEDGE_DATABASE_RESET !== 'RESET_DISPOSABLE_DATABASE') {
  console.error(`DB_OPERATION_NOT_ALLOWED: reset requires ACKNOWLEDGE_DATABASE_RESET=RESET_DISPOSABLE_DATABASE.`);
  process.exit(1);
}

let guarded: ReturnType<typeof assertDatabaseOperationAllowed>;
try {
  guarded = assertDatabaseOperationAllowed({
    operation: definition.operation,
    requiredApplicationEnvironment: definition.requiredEnvironment,
    appEnvironment: process.env.APP_ENV,
    databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
    databaseUrl: process.env.DATABASE_URL,
    expectedFingerprint: process.env.DATABASE_FINGERPRINT,
    productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: process.env.DATABASE_BRANCH_ID,
    productionMigrationPath: definition.productionMigrationPath,
    productionMigrationAcknowledgement: process.env.ACKNOWLEDGE_PRODUCTION_MIGRATION,
    productionMigrationChangeId: process.env.PRODUCTION_MIGRATION_CHANGE_ID
  });
} catch (error) {
  exitWithError(error);
}

console.log(
  `Database safety guard passed: operation=${definition.operation} app=${guarded.appEnvironment} database=${guarded.databaseEnvironment} ${formatSafeDatabaseIdentity(guarded.identity)}`
);

function run(result: { status: number | null }) {
  const status = result.status ?? 1;
  if (status !== 0) process.exit(status);
}

function verifierMode(stage: 'status' | 'preflight' | 'postflight'): VerifierMode {
  const production = guarded.appEnvironment === 'production';
  if (stage === 'status') return production ? 'production-status' : 'strict-status';
  return `${production ? 'production' : 'strict'}-${stage}`;
}

function runVerifier(stage: 'status' | 'preflight' | 'postflight') {
  const mode = verifierMode(stage);
  const status = launchFixedLineageVerifier(mode, { env: process.env }).status ?? 1;
  const decision = classifyVerifierExit(mode, status);
  if (decision.kind === 'unsafe-failure') {
    console.error(
      `MIGRATION_LINEAGE_VERIFIER_FAILED: mode=${mode} exitCode=${decision.exitCode}`
    );
    process.exit(decision.exitCode);
  }
  if (decision.kind === 'verified-pending-blocked') {
    console.error(JSON.stringify(productionPendingBlockEvidence()));
    console.error(
      'Production lineage verification passed, but an approved repository migration remains pending. ' +
        'The status-only Production deployment is intentionally blocked; no migration was applied.'
    );
    process.exit(decision.exitCode);
  }
}

if (definition.operation === 'migration-status') {
  runVerifier('status');
  process.exit(0);
}

if (definition.operation === 'migration-deploy') {
  console.log('Running independent migration lineage verifier before deployment.');
  runVerifier('preflight');
}

if (definition.prismaCommand) {
  run(launchFixedPrismaCommand(definition.prismaCommand, { env: process.env }));
} else if (definition.seed) {
  run(launchFixedSeed({ env: process.env }));
}

if (definition.operation === 'migration-deploy') {
  console.log('Running independent migration lineage verifier after deployment.');
  runVerifier('postflight');
}
