import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertDatabaseOperationAllowed,
  assertDisposableTestDatabase,
  assertDistinctDatabaseIdentities,
  formatDatabaseSafetyError,
  formatSafeDatabaseIdentity,
  getDatabaseIdentity
} from '../lib/database-safety';
import { runBoundedProcess } from '../lib/bounded-process';
import {
  resolveFixedPrismaEntrypoint
} from '../lib/fixed-database-command-launcher';
import { resolveFixedNodeExecutable } from '../lib/fixed-package-script-launcher';

export const POSTGRES_INTEGRATION_TIMEOUTS = {
  migrationMs: 180_000,
  testFileMs: 300_000,
  suiteMs: 900_000
} as const;

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
  DATABASE_BRANCH_ID: process.env.TEST_DATABASE_BRANCH_ID ?? '',
  // This runner has already proved the target is a disposable test database.
  // Manual creation remains closed unless this explicit test-only policy is set.
  MANUAL_LEAD_CREATION_ENABLED: 'true'
};

const repositoryRoot = process.cwd();
const node = resolveFixedNodeExecutable();
const prisma = resolveFixedPrismaEntrypoint({ repositoryRoot });
const integrationDirectory = join(repositoryRoot, 'tests', 'integration');
const integrationFiles = readdirSync(integrationDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.integration.test.ts'))
  .map((entry) => join('tests', 'integration', entry.name))
  .sort();

if (!integrationFiles.length) {
  console.error('PREPRODUCTION_VALIDATION_FAILED: stage=integration-inventory; no integration tests found.');
  process.exit(1);
}

async function main() {
  const suiteStartedAt = performance.now();
  const migration = await runBoundedProcess({
    stage: 'integration-migration',
    program: node,
    arguments: [prisma, 'migrate', 'deploy'],
    timeoutMs: POSTGRES_INTEGRATION_TIMEOUTS.migrationMs,
    cwd: repositoryRoot,
    env,
    mirrorOutput: true
  });
  console.log(
    `PREPRODUCTION_STAGE_RESULT: stage=integration-migration; durationMs=${migration.durationMs}; exitCode=0`
  );

  const fileTimings: Array<{ file: string; durationMs: number }> = [];
  for (const [index, file] of integrationFiles.entries()) {
    const elapsed = performance.now() - suiteStartedAt;
    if (elapsed >= POSTGRES_INTEGRATION_TIMEOUTS.suiteMs) {
      throw new Error(
        `PREPRODUCTION_VALIDATION_TIMEOUT: stage=integration-suite; timeoutMs=${POSTGRES_INTEGRATION_TIMEOUTS.suiteMs}`
      );
    }
    const result = await runBoundedProcess({
      stage: `integration-file-${String(index + 1).padStart(2, '0')}`,
      program: node,
      arguments: ['--import', 'tsx', '--test', '--test-concurrency=1', file],
      timeoutMs: Math.min(
        POSTGRES_INTEGRATION_TIMEOUTS.testFileMs,
        POSTGRES_INTEGRATION_TIMEOUTS.suiteMs - Math.round(elapsed)
      ),
      cwd: repositoryRoot,
      env,
      mirrorOutput: true
    });
    fileTimings.push({ file: file.replaceAll('\\', '/'), durationMs: result.durationMs });
    console.log(
      `PREPRODUCTION_STAGE_RESULT: stage=integration-file; file=${file.replaceAll('\\', '/')}; durationMs=${result.durationMs}; exitCode=0`
    );
  }
  console.log(
    `PREPRODUCTION_INTEGRATION_RESULT=${JSON.stringify({
      result: 'passed',
      fileCount: integrationFiles.length,
      migrationDurationMs: migration.durationMs,
      testDurationMs: Math.round(performance.now() - suiteStartedAt - migration.durationMs),
      totalDurationMs: Math.round(performance.now() - suiteStartedAt),
      fileTimings
    })}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'PREPRODUCTION_VALIDATION_FAILED: unknown integration failure.');
  process.exitCode = 1;
});
