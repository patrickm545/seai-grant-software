import assert from 'node:assert/strict';
import test from 'node:test';
import type { SpawnSyncReturns } from 'node:child_process';
import {
  FIXED_PRODUCTION_EVIDENCE_SCRIPT,
  launchFixedProductionEvidenceCapture,
  launchHarmlessPackageManagerVersionProbe,
  resolvePinnedPackageManagerLauncher,
  type PackageManagerLauncherDependencies
} from '../../lib/fixed-package-script-launcher';

function spawnResult(input: {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
} = {}): SpawnSyncReturns<string> {
  return {
    pid: 1,
    output: [null, input.stdout ?? '', input.stderr ?? ''],
    stdout: input.stdout ?? '',
    stderr: input.stderr ?? '',
    status: input.status === undefined ? 0 : input.status,
    signal: null,
    error: input.error
  };
}

function windowsDependencies(
  overrides: Partial<PackageManagerLauncherDependencies> = {}
): PackageManagerLauncherDependencies {
  const files = new Set([
    'C:\\Node\\corepack.cmd',
    'C:\\Node\\node_modules\\corepack\\dist\\corepack.js',
    'C:\\Runtime\\node.exe'
  ]);
  return {
    platform: 'win32',
    pathValue: 'C:\\Node',
    execPath: 'C:\\Runtime\\node.exe',
    exists: (path) => files.has(path),
    realpath: (path) => path,
    ...overrides
  };
}

test('Windows resolves Corepack through Node instead of spawning the .cmd shim', () => {
  const launcher = resolvePinnedPackageManagerLauncher(windowsDependencies());
  assert.deepEqual(launcher, {
    program: 'C:\\Runtime\\node.exe',
    prefixArguments: [
      'C:\\Node\\node_modules\\corepack\\dist\\corepack.js',
      'pnpm@10.11.0'
    ],
    shell: false,
    mechanism: 'windows-node-corepack-entrypoint'
  });
});

test('Windows fixed capture launch preserves exact arguments without a shell', () => {
  let observed:
    | { program: string; arguments_: readonly string[]; shell: string | boolean | undefined }
    | undefined;
  const result = launchFixedProductionEvidenceCapture({
    ...windowsDependencies(),
    spawn: (program, arguments_, options) => {
      observed = { program, arguments_, shell: options.shell };
      return spawnResult({ stdout: '{"safe":true}\\n' });
    }
  });
  assert.equal(result.status, 0);
  assert.deepEqual(observed, {
    program: 'C:\\Runtime\\node.exe',
    arguments_: [
      'C:\\Node\\node_modules\\corepack\\dist\\corepack.js',
      'pnpm@10.11.0',
      '--silent',
      'run',
      FIXED_PRODUCTION_EVIDENCE_SCRIPT
    ],
    shell: false
  });
});

test('POSIX keeps direct Corepack execution and the pinned package manager', () => {
  const launcher = resolvePinnedPackageManagerLauncher({
    platform: 'linux',
    pathValue: '/usr/local/bin:/usr/bin',
    execPath: '/usr/bin/node',
    exists: (path) => path === '/usr/local/bin/corepack',
    realpath: (path) => path
  });
  assert.deepEqual(launcher, {
    program: '/usr/local/bin/corepack',
    prefixArguments: ['pnpm@10.11.0'],
    shell: false,
    mechanism: 'posix-corepack-executable'
  });
});

test('exit code and safe stderr are preserved exactly', () => {
  const result = launchHarmlessPackageManagerVersionProbe({
    ...windowsDependencies(),
    spawn: () => spawnResult({ status: 23, stderr: 'safe diagnostic\\n' })
  });
  assert.equal(result.status, 23);
  assert.equal(result.stderr, 'safe diagnostic\\n');
});

test('missing and ambiguous launcher resolution fail closed', () => {
  assert.throws(
    () =>
      resolvePinnedPackageManagerLauncher(
        windowsDependencies({ exists: () => false })
      ),
    /expected one Windows Corepack shim; found 0/
  );
  assert.throws(
    () =>
      resolvePinnedPackageManagerLauncher(
        windowsDependencies({
          pathValue: 'C:\\Node;D:\\OtherNode',
          exists: (path) =>
            path === 'C:\\Node\\corepack.cmd' ||
            path === 'D:\\OtherNode\\corepack.cmd',
          realpath: (path) => path
        })
      ),
    /expected one Windows Corepack shim; found 2/
  );
  assert.throws(
    () =>
      resolvePinnedPackageManagerLauncher(
        windowsDependencies({
          execPath: 'C:\\Runtime\\unexpected.exe',
          exists: (path) =>
            path === 'C:\\Node\\corepack.cmd' ||
            path === 'C:\\Node\\node_modules\\corepack\\dist\\corepack.js' ||
            path === 'C:\\Runtime\\unexpected.exe'
        })
      ),
    /Node executable resolution is unexpected/
  );
});

test('launcher failures expose only a safe error code, never environment secrets', () => {
  const sentinel = 'mock-credential-value-that-must-not-appear';
  const error = Object.assign(new Error(`spawn failed with ${sentinel}`), {
    code: 'EINVAL'
  });
  assert.throws(
    () =>
      launchHarmlessPackageManagerVersionProbe({
        ...windowsDependencies(),
        env: { NODE_ENV: 'test', DATABASE_URL: sentinel },
        spawn: () => spawnResult({ error })
      }),
    (thrown: unknown) =>
      thrown instanceof Error &&
      thrown.message === 'FIXED_LAUNCHER_FAILED: process launch failed with code EINVAL.' &&
      !thrown.message.includes(sentinel)
  );
});

test('shell metacharacters in environment values cannot alter fixed arguments', () => {
  const hostile = 'value&echo injected|whoami';
  let observedEnvironment: NodeJS.ProcessEnv | undefined;
  let observedShell: string | boolean | undefined;
  launchHarmlessPackageManagerVersionProbe({
    ...windowsDependencies(),
    env: { NODE_ENV: 'test', DATABASE_URL: hostile },
    spawn: (_program, _arguments, options) => {
      observedEnvironment = options.env;
      observedShell = options.shell;
      return spawnResult({ stdout: '10.11.0\\n' });
    }
  });
  assert.equal(observedEnvironment?.DATABASE_URL, hostile);
  assert.equal(observedShell, false);
});

test('control-character injection in the resolved program is rejected', () => {
  assert.throws(
    () =>
      launchHarmlessPackageManagerVersionProbe({
        ...windowsDependencies({
          execPath: 'C:\\Runtime\\node.exe\nmalicious',
          exists: (path) =>
            path === 'C:\\Node\\corepack.cmd' ||
            path === 'C:\\Node\\node_modules\\corepack\\dist\\corepack.js' ||
            path === 'C:\\Runtime\\node.exe\nmalicious'
        }),
        spawn: () => {
          throw new Error('spawn must not be reached');
        }
      }),
    /unsupported control character/
  );
});
