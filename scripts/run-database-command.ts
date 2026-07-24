import { spawnSync } from 'node:child_process';
import {
  assertDatabaseOperationAllowed,
  formatDatabaseSafetyError,
  formatSafeDatabaseIdentity,
  getDatabaseIdentity,
  type ApplicationEnvironment,
  type DatabaseOperation
} from '../lib/database-safety';
import { evaluateMigrationPreflight } from '../lib/migration-status';

type CommandDefinition = {
  operation: DatabaseOperation;
  prismaArgs?: string[];
  command?: string;
  commandArgs?: string[];
  productionMigrationPath?: boolean;
  resetAcknowledgement?: boolean;
  requiredEnvironment?: ApplicationEnvironment;
};

const commandName = process.argv[2];
const commands: Record<string, CommandDefinition> = {
  status: { operation: 'migration-status', prismaArgs: ['migrate', 'status'] },
  'migrate-preview': {
    operation: 'migration-deploy',
    prismaArgs: ['migrate', 'deploy'],
    requiredEnvironment: 'preview'
  },
  'migrate-test': {
    operation: 'migration-deploy',
    prismaArgs: ['migrate', 'deploy'],
    requiredEnvironment: 'test'
  },
  'migrate-development': {
    operation: 'migration-dev',
    prismaArgs: ['migrate', 'dev'],
    requiredEnvironment: 'development'
  },
  'migrate-production': {
    operation: 'migration-deploy',
    prismaArgs: ['migrate', 'deploy'],
    productionMigrationPath: true,
    requiredEnvironment: 'production'
  },
  'seed-development': {
    operation: 'seed',
    command: 'tsx',
    commandArgs: ['prisma/seed.ts'],
    requiredEnvironment: 'development'
  },
  'seed-test': {
    operation: 'seed',
    command: 'tsx',
    commandArgs: ['prisma/seed.ts'],
    requiredEnvironment: 'test'
  },
  reset: { operation: 'reset', prismaArgs: ['migrate', 'reset'], resetAcknowledgement: true }
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

let guarded;
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

function run(program: string, args: string[], acceptedExitCodes = [0]) {
  const result = spawnSync(program, args, {
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });
  const status = result.status ?? 1;
  if (!acceptedExitCodes.includes(status)) process.exit(status);
  return status;
}

function runMigrationPreflight() {
  const result = spawnSync('prisma', ['migrate', 'status'], {
    env: process.env,
    shell: process.platform === 'win32',
    encoding: 'utf8'
  });
  const status = result.status ?? 1;
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  let state;
  try {
    state = evaluateMigrationPreflight(status, output);
  } catch {
    console.error('DB_OPERATION_NOT_ALLOWED: Prisma migration preflight could not prove a safe pending-migration state.');
    process.exit(status || 1);
  }

  if (state === 'up-to-date') {
    console.log('Migration preflight: schema is currently up to date.');
    return;
  }
  console.log('Migration preflight: repository migrations are pending and eligible for this deliberate deploy step.');
}

if (definition.operation === 'migration-deploy') {
  console.log('Running Prisma migration status before deployment.');
  runMigrationPreflight();
}

if (definition.prismaArgs) run('prisma', definition.prismaArgs);
else run(definition.command!, definition.commandArgs!);

if (definition.operation === 'migration-deploy') {
  console.log('Verifying Prisma migration status after deployment.');
  run('prisma', ['migrate', 'status']);
}
