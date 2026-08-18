import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs';
import { createServer, Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import {
  assertDisposableTestDatabase,
  getDatabaseIdentity
} from '../lib/database-safety';
import { runBoundedProcess } from '../lib/bounded-process';
import {
  PREPRODUCTION_TIMEOUT_POLICY,
  removeSafeDisposableRoot,
  runWithGuaranteedCleanup
} from '../lib/preproduction-validation';
import { resolveFixedPrismaEntrypoint } from '../lib/fixed-database-command-launcher';
import { resolveFixedNodeExecutable } from '../lib/fixed-package-script-launcher';
import type { MigrationManifest } from '../lib/migration-manifest';

const TARGET_MIGRATION = '20260724180000_password_reset_foundation';
const TARGET_CHECKSUM = 'cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7';
const EXPECTED_POSTFLIGHT_FINGERPRINT =
  '685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343';
const PERSISTENT_FINGERPRINTS = {
  production: 'db_4e1d3bd23cff6801',
  preview: 'db_31449de1074844bb',
  development: 'db_04701984b484da4b'
} as const;

type StageTiming = { stage: string; durationMs: number; exitCode: number };

function executable(postgresBin: string, name: string) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const path = realpathSync(join(postgresBin, `${name}${suffix}`));
  if (basename(path).toLocaleLowerCase() !== `${name}${suffix}`.toLocaleLowerCase()) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: PostgreSQL executable identity is invalid.');
  }
  return path;
}

function resolvePostgresBin() {
  const configured = process.env.PREPRODUCTION_POSTGRES_BIN?.trim();
  const candidate = configured ||
    (process.platform === 'win32' ? 'C:\\Program Files\\PostgreSQL\\18\\bin' : '');
  if (!candidate) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: PREPRODUCTION_POSTGRES_BIN is required.');
  }
  return realpathSync(resolve(candidate));
}

async function reserveLoopbackPort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function canConnect(port: number) {
  return new Promise<boolean>((resolveConnection) => {
    const socket = new Socket();
    let settled = false;
    const finish = (connected: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveConnection(connected);
    };
    socket.setTimeout(500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port: number, expectedOpen: boolean, timeoutMs: number) {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    if ((await canConnect(port)) === expectedOpen) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(
    `PREPRODUCTION_VALIDATION_TIMEOUT: stage=${expectedOpen ? 'database-readiness' : 'cleanup-port-close'}; timeoutMs=${timeoutMs}`
  );
}

function copyPretargetMigrations(repositoryRoot: string, temporaryRoot: string) {
  const manifest = JSON.parse(
    readFileSync(join(repositoryRoot, 'prisma', 'migration-manifest.json'), 'utf8')
  ) as MigrationManifest;
  const target = manifest.migrations.find((migration) => migration.name === TARGET_MIGRATION);
  if (
    !target ||
    target.position !== manifest.migrations.length - 1 ||
    target.checksum !== TARGET_CHECKSUM ||
    manifest.migrations.length !== 16
  ) {
    throw new Error('PREPRODUCTION_VALIDATION_FAILED: target migration manifest identity differs.');
  }
  const sql = readFileSync(
    join(repositoryRoot, 'prisma', 'migrations', TARGET_MIGRATION, 'migration.sql')
  );
  if (createHash('sha256').update(sql).digest('hex') !== TARGET_CHECKSUM) {
    throw new Error('PREPRODUCTION_VALIDATION_FAILED: target migration bytes differ.');
  }

  const prismaRoot = join(temporaryRoot, 'pretarget-prisma');
  const migrationsRoot = join(prismaRoot, 'migrations');
  mkdirSync(migrationsRoot, { recursive: true });
  copyFileSync(join(repositoryRoot, 'prisma', 'schema.prisma'), join(prismaRoot, 'schema.prisma'));
  const lock = join(repositoryRoot, 'prisma', 'migrations', 'migration_lock.toml');
  if (existsSync(lock)) copyFileSync(lock, join(migrationsRoot, 'migration_lock.toml'));
  for (const migration of manifest.migrations.filter((entry) => entry.position < target.position)) {
    cpSync(
      join(repositoryRoot, 'prisma', 'migrations', migration.name),
      join(migrationsRoot, migration.name),
      { recursive: true, errorOnExist: true }
    );
  }
  return { schemaPath: join(prismaRoot, 'schema.prisma'), manifest };
}

function verifierAssertions(output: string, phase: 'preflight' | 'postflight') {
  const common = [
    '"attestedRepositoryChecksumDivergences": []',
    '"attestedHistoricalResolvedMigration": "not-applicable"',
    '"finalDecision": "verified-clean"'
  ];
  const expected = phase === 'preflight'
    ? [...common, '"appliedMigrationCount": 15', `"${TARGET_MIGRATION}"`]
    : [
        ...common,
        '"appliedMigrationCount": 16',
        '"pendingMigrations": []',
        `"schemaFingerprint": "${EXPECTED_POSTFLIGHT_FINGERPRINT}"`
      ];
  if (expected.some((value) => !output.includes(value))) {
    throw new Error(`PREPRODUCTION_VALIDATION_FAILED: stage=strict-${phase}; verifier evidence is incomplete.`);
  }
}

async function main() {
  if (process.env.DATABASE_URL?.trim()) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: DATABASE_URL must be absent before this gate starts.');
  }
  const repositoryRoot = process.cwd();
  const repositorySha = String(
    (await runBoundedProcess({
      stage: 'repository-revision',
      program: 'git',
      arguments: ['rev-parse', 'HEAD'],
      timeoutMs: 10_000,
      cwd: repositoryRoot
    })).stdout
  ).trim();
  const postgresBin = resolvePostgresBin();
  const initdb = executable(postgresBin, 'initdb');
  const pgCtl = executable(postgresBin, 'pg_ctl');
  const createdb = executable(postgresBin, 'createdb');
  const node = resolveFixedNodeExecutable();
  const prisma = resolveFixedPrismaEntrypoint({ repositoryRoot });
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'clada-adr0024-preproduction-'));
  if (dirname(realpathSync(temporaryRoot)) !== realpathSync(tmpdir())) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: disposable root is outside the system temp directory.');
  }
  const dataDirectory = join(temporaryRoot, 'postgres-data');
  const postgresLog = join(temporaryRoot, 'postgres.log');
  const port = await reserveLoopbackPort();
  const databaseName = `clada_preproduction_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const databaseUrl = `postgresql://postgres@127.0.0.1:${port}/${databaseName}`;
  const identity = getDatabaseIdentity(databaseUrl, {
    branchId: 'local-preproduction-validation',
    operation: 'integration-test'
  });
  assertDisposableTestDatabase(identity, PERSISTENT_FINGERPRINTS);
  const timings: StageTiming[] = [];
  let serverStarted = false;

  const writeEvidence = (value: Record<string, unknown>) => {
    const evidenceDirectory = join(repositoryRoot, '.tools', 'preproduction-validation');
    mkdirSync(evidenceDirectory, { recursive: true });
    const evidencePath = join(
      evidenceDirectory,
      `${new Date().toISOString().replaceAll(':', '-')}.json`
    );
    writeFileSync(evidencePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    return evidencePath;
  };

  const runStage = async (input: Parameters<typeof runBoundedProcess>[0]) => {
    const result = await runBoundedProcess(input);
    timings.push({ stage: result.stage, durationMs: result.durationMs, exitCode: 0 });
    console.log(
      `PREPRODUCTION_STAGE_RESULT: stage=${result.stage}; durationMs=${result.durationMs}; exitCode=0`
    );
    return result;
  };

  let result;
  try {
    result = await runWithGuaranteedCleanup({
      validate: async () => {
      await runStage({
        stage: 'database-initialization',
        program: initdb,
        arguments: ['-D', dataDirectory, '-U', 'postgres', '-A', 'trust', '--no-locale'],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.databaseInitializationMs,
        cwd: repositoryRoot,
        mirrorOutput: true
      });
      // pg_ctl starts postgres through a background Windows cmd process. Its
      // stdio must be ignored so the descendant cannot retain a captured pipe
      // and make an already-successful start look hung.
      await runStage({
        stage: 'database-startup',
        program: pgCtl,
        arguments: [
          '-D', dataDirectory,
          '-l', postgresLog,
          '-o', `-h 127.0.0.1 -p ${port}`,
          '-w', 'start'
        ],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.databaseStartupMs,
        cwd: repositoryRoot,
        stdio: 'ignore'
      });
      serverStarted = true;
      await waitForPort(port, true, PREPRODUCTION_TIMEOUT_POLICY.databaseStartupMs);
      await runStage({
        stage: 'database-creation',
        program: createdb,
        arguments: ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', databaseName],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.databaseCreationMs,
        cwd: repositoryRoot,
        mirrorOutput: true
      });
      const { schemaPath } = copyPretargetMigrations(repositoryRoot, temporaryRoot);
      const databaseEnvironment = {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_ENVIRONMENT: 'test',
        DATABASE_URL: databaseUrl,
        DATABASE_FINGERPRINT: identity.fingerprint,
        DATABASE_BRANCH_ID: 'local-preproduction-validation',
        PRODUCTION_DATABASE_FINGERPRINT: PERSISTENT_FINGERPRINTS.production
      };
      await runStage({
        stage: 'canonical-pretarget-migrations',
        program: node,
        arguments: [prisma, 'migrate', 'deploy', '--schema', schemaPath],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.canonicalMigrationMs,
        cwd: repositoryRoot,
        env: databaseEnvironment,
        mirrorOutput: true
      });
      const preflight = await runStage({
        stage: 'strict-preflight',
        program: node,
        arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'verify-migration-lineage.ts'), 'strict-preflight'],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.verifierMs,
        cwd: repositoryRoot,
        env: databaseEnvironment,
        mirrorOutput: true
      });
      verifierAssertions(preflight.stdout.toString('utf8'), 'preflight');
      const guarded = await runStage({
        stage: 'guarded-password-reset-rehearsal',
        program: node,
        arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'run-database-command.ts'), 'migrate-test'],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.guardedRehearsalMs,
        cwd: repositoryRoot,
        env: databaseEnvironment,
        mirrorOutput: true
      });
      if (
        !guarded.stdout.toString('utf8').includes('Running independent migration lineage verifier after deployment.')
      ) {
        throw new Error('PREPRODUCTION_VALIDATION_FAILED: guarded runner did not reach strict postflight.');
      }
      const postflight = await runStage({
        stage: 'strict-postflight',
        program: node,
        arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'verify-migration-lineage.ts'), 'strict-postflight'],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.verifierMs,
        cwd: repositoryRoot,
        env: databaseEnvironment,
        mirrorOutput: true
      });
      verifierAssertions(postflight.stdout.toString('utf8'), 'postflight');
      const integrationEnvironment: NodeJS.ProcessEnv = {
        ...process.env,
        TEST_DATABASE_URL: databaseUrl,
        TEST_DATABASE_ENVIRONMENT: 'test',
        TEST_DATABASE_FINGERPRINT: identity.fingerprint,
        TEST_DATABASE_BRANCH_ID: 'local-preproduction-validation',
        PRODUCTION_DATABASE_FINGERPRINT: PERSISTENT_FINGERPRINTS.production,
        PREVIEW_DATABASE_FINGERPRINT: PERSISTENT_FINGERPRINTS.preview,
        DEVELOPMENT_DATABASE_FINGERPRINT: PERSISTENT_FINGERPRINTS.development
      };
      delete integrationEnvironment.DATABASE_URL;
      delete integrationEnvironment.DATABASE_FINGERPRINT;
      delete integrationEnvironment.DATABASE_BRANCH_ID;
      const integration = await runStage({
        stage: 'integration-suite',
        program: node,
        arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'run-postgres-integration-tests.ts')],
        timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.integrationSuiteMs,
        cwd: repositoryRoot,
        env: integrationEnvironment,
        mirrorOutput: true
      });
      if (!integration.stdout.toString('utf8').includes('PREPRODUCTION_INTEGRATION_RESULT=')) {
        throw new Error('PREPRODUCTION_VALIDATION_FAILED: integration suite summary is missing.');
      }
      return {
        version: 'adr-0024-preproduction-database-gate/v1',
        result: 'passed',
        repositorySha,
        databaseFingerprint: identity.fingerprint,
        targetMigration: TARGET_MIGRATION,
        targetChecksum: TARGET_CHECKSUM,
        appliedMigrations: 16,
        pendingMigrations: [],
        postMigrationSchemaFingerprint: EXPECTED_POSTFLIGHT_FINGERPRINT,
        productionTuplesUsed: false,
        attestedHistoricalResolvedMigrationUsed: false,
        timings
      };
      },
      stop: async () => {
        if (!serverStarted) return;
        await runStage({
          stage: 'database-cleanup-stop',
          program: pgCtl,
          arguments: ['-D', dataDirectory, '-m', 'fast', '-w', 'stop'],
          timeoutMs: PREPRODUCTION_TIMEOUT_POLICY.cleanupMs,
          cwd: repositoryRoot,
          stdio: 'ignore'
        });
        serverStarted = false;
      },
      assertPortClosed: async () => {
        await waitForPort(port, false, PREPRODUCTION_TIMEOUT_POLICY.cleanupMs);
      },
      remove: async () => {
        removeSafeDisposableRoot(temporaryRoot, tmpdir());
      }
    });
  } catch (error) {
    writeEvidence({
      version: 'adr-0024-preproduction-database-gate/v1',
      result: 'failed',
      repositorySha,
      databaseFingerprint: identity.fingerprint,
      targetMigration: TARGET_MIGRATION,
      targetChecksum: TARGET_CHECKSUM,
      failure: error instanceof Error ? error.message : 'unknown failure',
      timings,
      productionAccess: false
    });
    throw error;
  }

  const evidencePath = writeEvidence({ ...result, cleanup: 'verified' });
  console.log(`PREPRODUCTION_DATABASE_GATE_RESULT=${JSON.stringify({
    ...result,
    cleanup: 'verified',
    evidenceReference: evidencePath.replace(repositoryRoot, '').replaceAll('\\', '/').replace(/^\//, '')
  })}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'PREPRODUCTION_VALIDATION_FAILED: unknown failure.');
  process.exitCode = 1;
});
