import assert from 'node:assert/strict';
import type { SpawnSyncOptions, SpawnSyncReturns } from 'node:child_process';
import test from 'node:test';
import {
  FIXED_DATABASE_LAUNCHER_SMOKE_ARGUMENT,
  launchFixedDatabaseLauncherSmoke,
  launchFixedGuardedDatabaseCommandFromEnvFile,
  launchFixedLineageVerifier,
  launchFixedPostMigrationProductionEvidenceCaptureRaw,
  launchFixedPrismaCommand,
  launchFixedSeed,
  resolveFixedPrismaEntrypoint,
  type FixedDatabaseLauncherDependencies
} from '../../lib/fixed-database-command-launcher';

type ObservedSpawn = {
  program: string;
  arguments: readonly string[];
  options: SpawnSyncOptions;
};

function spawnResult(input: {
  status?: number | null;
  stdout?: Buffer;
  stderr?: Buffer;
  error?: Error;
} = {}): SpawnSyncReturns<Buffer> {
  const stdout = input.stdout ?? Buffer.alloc(0);
  const stderr = input.stderr ?? Buffer.alloc(0);
  return {
    pid: 1,
    output: [null, stdout, stderr],
    stdout,
    stderr,
    status: input.status === undefined ? 0 : input.status,
    signal: null,
    error: input.error
  };
}

function windowsDependencies(
  observe?: (spawn: ObservedSpawn) => SpawnSyncReturns<Buffer>
): FixedDatabaseLauncherDependencies {
  const repositoryRoot = 'C:\\Repository With Spaces\\seai';
  const files = new Set([
    'C:\\Program Files\\nodejs\\node.exe',
    `${repositoryRoot}\\scripts\\verify-migration-lineage.ts`,
    `${repositoryRoot}\\scripts\\fixed-database-launcher-smoke-target.ts`,
    `${repositoryRoot}\\scripts\\run-database-command.ts`,
    `${repositoryRoot}\\scripts\\launch-post-migration-production-evidence.ts`,
    `${repositoryRoot}\\scripts\\capture-post-migration-production-evidence.ts`,
    `${repositoryRoot}\\prisma\\seed.ts`,
    `${repositoryRoot}\\node_modules\\prisma\\build\\index.js`,
    `${repositoryRoot}\\node_modules\\prisma\\package.json`
  ]);
  return {
    platform: 'win32',
    execPath: 'C:\\Program Files\\nodejs\\node.exe',
    repositoryRoot,
    exists: (path) => files.has(path),
    realpath: (path) => path,
    readFile: (path) => {
      assert.equal(path, `${repositoryRoot}\\node_modules\\prisma\\package.json`);
      return '{"name":"prisma"}';
    },
    spawn: (program, arguments_, options) =>
      observe?.({ program, arguments: arguments_, options }) ?? spawnResult()
  };
}

test('Windows strict preflight uses the resolved Node executable, exact argv, and no shell', () => {
  let observed: ObservedSpawn | undefined;
  const result = launchFixedLineageVerifier('strict-preflight', {
    ...windowsDependencies((spawn) => {
      observed = spawn;
      return spawnResult({ status: 25 });
    }),
    env: { NODE_ENV: 'test', DATABASE_URL: 'value&whoami|echo must-not-execute' }
  });
  assert.equal(result.status, 25);
  assert.equal(observed?.program, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(observed?.arguments, [
    '--import',
    'tsx',
    'C:\\Repository With Spaces\\seai\\scripts\\verify-migration-lineage.ts',
    'strict-preflight'
  ]);
  assert.equal(observed?.options.shell, false);
  assert.equal(observed?.options.windowsHide, true);
  assert.equal(observed?.options.env?.DATABASE_URL, 'value&whoami|echo must-not-execute');
});

test('strict postflight preserves its exact mode as one argument', () => {
  let observed: ObservedSpawn | undefined;
  launchFixedLineageVerifier('strict-postflight', {
    ...windowsDependencies((spawn) => {
      observed = spawn;
      return spawnResult();
    })
  });
  assert.deepEqual(observed?.arguments, [
    '--import',
    'tsx',
    'C:\\Repository With Spaces\\seai\\scripts\\verify-migration-lineage.ts',
    'strict-postflight'
  ]);
  assert.equal(observed?.options.shell, false);
});

test('Prisma deploy resolves the fixed package entrypoint and exact argv without PATH lookup', () => {
  let observed: ObservedSpawn | undefined;
  launchFixedPrismaCommand('migrate-deploy', {
    ...windowsDependencies((spawn) => {
      observed = spawn;
      return spawnResult();
    })
  });
  assert.equal(observed?.program, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(observed?.arguments, [
    'C:\\Repository With Spaces\\seai\\node_modules\\prisma\\build\\index.js',
    'migrate',
    'deploy'
  ]);
  assert.equal(observed?.options.shell, false);
});

test('seed resolves the fixed repository file and cannot accept caller argv', () => {
  let observed: ObservedSpawn | undefined;
  launchFixedSeed({
    ...windowsDependencies((spawn) => {
      observed = spawn;
      return spawnResult();
    })
  });
  assert.deepEqual(observed?.arguments, [
    '--import',
    'tsx',
    'C:\\Repository With Spaces\\seai\\prisma\\seed.ts'
  ]);
  assert.equal(observed?.options.shell, false);
});

test('harmless smoke uses the same exact Windows launcher architecture', () => {
  let observed: ObservedSpawn | undefined;
  const result = launchFixedDatabaseLauncherSmoke({
    ...windowsDependencies((spawn) => {
      observed = spawn;
      return spawnResult({ stdout: Buffer.from('fixed-database-launcher-smoke-ok/v1\n') });
    })
  });
  assert.deepEqual(observed?.arguments, [
    '--import',
    'tsx',
    'C:\\Repository With Spaces\\seai\\scripts\\fixed-database-launcher-smoke-target.ts',
    FIXED_DATABASE_LAUNCHER_SMOKE_ARGUMENT
  ]);
  assert.equal(observed?.options.shell, false);
  assert.equal(result.stdout.toString('utf8').trim(), 'fixed-database-launcher-smoke-ok/v1');
});

test('PowerShell, cmd, Windows Terminal, and VS Code markers cannot alter argv', () => {
  for (const env of [
    { SHELL: 'powershell.exe', PSModulePath: 'C:\\PowerShell' },
    { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
    { WT_SESSION: 'windows-terminal' },
    { TERM_PROGRAM: 'vscode' }
  ]) {
    let observed: ObservedSpawn | undefined;
    launchFixedLineageVerifier('strict-preflight', {
      ...windowsDependencies((spawn) => {
        observed = spawn;
        return spawnResult();
      }),
      env: { NODE_ENV: 'test', ...env }
    });
    assert.deepEqual(observed?.arguments.slice(-1), ['strict-preflight']);
    assert.equal(observed?.options.shell, false);
  }
});

test('quoted credential boundary hands exact unquoted value to fixed guarded argv without a shell', () => {
  let observed: ObservedSpawn | undefined;
  let observedFile = '';
  const databaseUrl =
    'postgresql://synthetic@127.0.0.1:5432/example?value=one=two';
  const result = launchFixedGuardedDatabaseCommandFromEnvFile(
    'migrate-test',
    'C:\\Credential Path\\quoted.env',
    {
      ...windowsDependencies((spawn) => {
        observed = spawn;
        return spawnResult({ status: 25 });
      }),
      env: {
        NODE_ENV: 'test',
        APP_ENV: 'test',
        SHELL: 'powershell.exe',
        WT_SESSION: 'windows-terminal'
      },
      loadCredentialEnvironment: (baseEnvironment, filePath) => {
        observedFile = filePath;
        return { ...baseEnvironment, DATABASE_URL: databaseUrl };
      }
    }
  );
  assert.equal(result.status, 25);
  assert.equal(observedFile, 'C:\\Credential Path\\quoted.env');
  assert.equal(observed?.program, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(observed?.arguments, [
    '--import',
    'tsx',
    'C:\\Repository With Spaces\\seai\\scripts\\run-database-command.ts',
    'migrate-test'
  ]);
  assert.equal(observed?.options.shell, false);
  assert.equal(observed?.options.env?.DATABASE_URL, databaseUrl);
});

test('post-migration Production evidence uses the fixed credential-bound retained launcher only', () => {
  let observed: ObservedSpawn | undefined;
  const databaseUrl =
    'postgresql://synthetic@127.0.0.1:5432/neondb?value=one=two&shell=whoami|echo';
  const result = launchFixedGuardedDatabaseCommandFromEnvFile(
    'post-migration-production-evidence',
    'C:\\Credential Path\\quoted-crlf.env',
    {
      ...windowsDependencies((spawn) => {
        observed = spawn;
        return spawnResult({ status: 26 });
      }),
      env: {
        NODE_ENV: 'test',
        SHELL: 'powershell.exe',
        ComSpec: 'C:\\Windows\\System32\\cmd.exe',
        WT_SESSION: 'windows-terminal',
        TERM_PROGRAM: 'vscode',
        POST_MIGRATION_PRODUCTION_EVIDENCE_CHANGE_ID:
          'CHG-2099-01-01-ADR0024-POST-MIGRATION-PROD-VERIFY-R99'
      },
      loadCredentialEnvironment: (baseEnvironment) => ({
        ...baseEnvironment,
        DATABASE_URL: databaseUrl
      })
    }
  );
  assert.equal(result.status, 26);
  assert.equal(observed?.program, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(observed?.arguments, [
    '--import',
    'tsx',
    'C:\\Repository With Spaces\\seai\\scripts\\launch-post-migration-production-evidence.ts'
  ]);
  assert.equal(observed?.options.shell, false);
  assert.equal(observed?.options.env?.DATABASE_URL, databaseUrl);
  assert.equal(
    observed?.options.env?.POST_MIGRATION_PRODUCTION_EVIDENCE_CHANGE_ID,
    'CHG-2099-01-01-ADR0024-POST-MIGRATION-PROD-VERIFY-R99'
  );
});

test('post-migration retention child uses fixed Node, fixed script, empty caller argv, and shell false', () => {
  let observed: ObservedSpawn | undefined;
  const result = launchFixedPostMigrationProductionEvidenceCaptureRaw({
    ...windowsDependencies((spawn) => {
      observed = spawn;
      return spawnResult({ status: 25 });
    }),
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'synthetic-value-that-must-remain-environment-only'
    }
  });
  assert.equal(result.status, 25);
  assert.equal(observed?.program, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(observed?.arguments, [
    '--import',
    'tsx',
    'C:\\Repository With Spaces\\seai\\scripts\\capture-post-migration-production-evidence.ts'
  ]);
  assert.equal(observed?.options.shell, false);
  assert.equal(observed?.options.env?.DATABASE_URL, 'synthetic-value-that-must-remain-environment-only');
  assert.doesNotMatch(JSON.stringify(observed?.arguments), /synthetic-value/);
});

test('credential boundary rejects unexpected commands before loading or spawning', () => {
  let loadCount = 0;
  let spawnCount = 0;
  assert.throws(
    () =>
      launchFixedGuardedDatabaseCommandFromEnvFile(
        'migrate-preview' as never,
        'C:\\Credential Path\\quoted.env',
        {
          ...windowsDependencies(() => {
            spawnCount += 1;
            return spawnResult();
          }),
          loadCredentialEnvironment: (baseEnvironment) => {
            loadCount += 1;
            return baseEnvironment;
          }
        }
      ),
    /unexpected guarded database command/
  );
  assert.equal(loadCount, 0);
  assert.equal(spawnCount, 0);
});

test('unexpected verifier and Prisma modes fail before spawning', () => {
  let spawnCount = 0;
  const dependencies = windowsDependencies(() => {
    spawnCount += 1;
    return spawnResult();
  });
  assert.throws(
    () => launchFixedLineageVerifier('unexpected' as never, dependencies),
    /unexpected verifier mode/
  );
  assert.throws(
    () => launchFixedPrismaCommand('unexpected' as never, dependencies),
    /unexpected Prisma command/
  );
  assert.equal(spawnCount, 0);
});

test('Prisma package identity must be exact', () => {
  assert.throws(
    () =>
      resolveFixedPrismaEntrypoint({
        ...windowsDependencies(),
        readFile: () => '{"name":"not-prisma"}'
      }),
    /Prisma CLI package identity is unexpected/
  );
});

test('launcher errors expose only the safe OS error code', () => {
  const sentinel = 'credential-value-that-must-not-appear';
  const error = Object.assign(new Error(`failed with ${sentinel}`), { code: 'EACCES' });
  assert.throws(
    () =>
      launchFixedLineageVerifier('strict-preflight', {
        ...windowsDependencies(() => spawnResult({ error })),
        env: { NODE_ENV: 'test', DATABASE_URL: sentinel }
      }),
    (thrown: unknown) =>
      thrown instanceof Error &&
      thrown.message ===
        'FIXED_DATABASE_LAUNCHER_FAILED: process launch failed with code EACCES.' &&
      !thrown.message.includes(sentinel)
  );
});
