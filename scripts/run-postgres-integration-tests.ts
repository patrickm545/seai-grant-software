import { spawnSync } from 'node:child_process';
import {
  assertDatabaseOperationAllowed,
  assertDisposableTestDatabase,
  assertDistinctDatabaseIdentities,
  formatDatabaseSafetyError,
  formatSafeDatabaseIdentity,
  getDatabaseIdentity
} from '../lib/database-safety';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

let guarded;
try {
  guarded = assertDatabaseOperationAllowed({
    operation: 'integration-test',
    appEnvironment: 'test',
    databaseEnvironment: process.env.TEST_DATABASE_ENVIRONMENT,
    databaseUrl: testDatabaseUrl,
    expectedFingerprint: process.env.TEST_DATABASE_FINGERPRINT,
    productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: process.env.TEST_DATABASE_BRANCH_ID
  });

  assertDisposableTestDatabase(guarded.identity, {
    production: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    preview: process.env.PREVIEW_DATABASE_FINGERPRINT,
    development: process.env.DEVELOPMENT_DATABASE_FINGERPRINT
  });

  if (process.env.DATABASE_URL?.trim()) {
    const primaryIdentity = getDatabaseIdentity(process.env.DATABASE_URL, {
      branchId: process.env.DATABASE_BRANCH_ID,
      operation: 'integration-test'
    });
    assertDistinctDatabaseIdentities(primaryIdentity, guarded.identity);
  }
} catch (error) {
  console.error(formatDatabaseSafetyError(error));
  process.exit(1);
}

console.log(`Disposable integration database accepted: ${formatSafeDatabaseIdentity(guarded.identity)}`);

const env = {
  ...process.env,
  APP_ENV: 'test',
  DATABASE_ENVIRONMENT: 'test',
  DATABASE_URL: testDatabaseUrl,
  DATABASE_FINGERPRINT: guarded.identity.fingerprint,
  DATABASE_BRANCH_ID: process.env.TEST_DATABASE_BRANCH_ID ?? ''
};

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('prisma', ['migrate', 'deploy']);
// Integration files share one disposable schema. Run files serially so their
// fixture transactions cannot create false serializable conflicts; individual
// tests still exercise real concurrent transactions where required.
run('node', ['--import', 'tsx', '--test', '--test-concurrency=1', 'tests/integration/**/*.test.ts']);
