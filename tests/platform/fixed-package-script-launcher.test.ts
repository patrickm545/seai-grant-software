import assert from 'node:assert/strict';
import test from 'node:test';
import type { SpawnSyncReturns } from 'node:child_process';
import {
  assertFixedLauncherArgumentVector,
  FIXED_LAUNCHER_SMOKE_SCRIPT,
  FIXED_PRODUCTION_EVIDENCE_SCRIPT,
  launchFixedLauncherSmoke,
  launchFixedProductionEvidenceCapture,
  launchFixedProductionEvidenceCaptureRaw,
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

function rawSpawnResult(input: {
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

test('raw fixed capture preserves exact argv, shell false, exit, and byte streams', () => {
  const stdout = Buffer.from([0, 10, 13, 255]);
  const stderr = Buffer.from('LEDGER_MISMATCH: safe diagnostic\n', 'utf8');
  let observed:
    | { program: string; arguments_: readonly string[]; shell: string | boolean | undefined }
    | undefined;
  const result = launchFixedProductionEvidenceCaptureRaw({
    ...windowsDependencies(),
    spawn: (program, arguments_, options) => {
      observed = { program, arguments_, shell: options.shell };
      return rawSpawnResult({ status: 25, stdout, stderr });
    }
  });
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
  assert.equal(result.status, 25);
  assert.deepEqual(result.stdout, stdout);
  assert.deepEqual(result.stderr, stderr);
});

test('fixed smoke uses the same Windows executable and exact argv boundary', () => {
  let observed:
    | { program: string; arguments_: readonly string[]; shell: string | boolean | undefined }
    | undefined;
  launchFixedLauncherSmoke({
    ...windowsDependencies(),
    spawn: (program, arguments_, options) => {
      observed = { program, arguments_, shell: options.shell };
      return spawnResult({ stdout: 'fixed-launcher-smoke-ok/v1\n' });
    }
  });
  assert.deepEqual(observed, {
    program: 'C:\\Runtime\\node.exe',
    arguments_: [
      'C:\\Node\\node_modules\\corepack\\dist\\corepack.js',
      'pnpm@10.11.0',
      '--silent',
      'run',
      FIXED_LAUNCHER_SMOKE_SCRIPT
    ],
    shell: false
  });
});

test('PowerShell, cmd, and Windows Terminal environment markers cannot change argv', () => {
  for (const env of [
    { PSModulePath: 'C:\\PowerShell', SHELL: 'powershell.exe' },
    { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
    { WT_SESSION: 'terminal-session', TERM_PROGRAM: 'vscode' }
  ]) {
    let observedArguments: readonly string[] | undefined;
    let observedShell: string | boolean | undefined;
    launchFixedLauncherSmoke({
      ...windowsDependencies(),
      env: { ...process.env, ...env },
      spawn: (_program, arguments_, options) => {
        observedArguments = arguments_;
        observedShell = options.shell;
        return spawnResult({ stdout: 'fixed-launcher-smoke-ok/v1\n' });
      }
    });
    assert.deepEqual(observedArguments, [
      'C:\\Node\\node_modules\\corepack\\dist\\corepack.js',
      'pnpm@10.11.0',
      '--silent',
      'run',
      FIXED_LAUNCHER_SMOKE_SCRIPT
    ]);
    assert.equal(observedShell, false);
  }
});

test('an impossible empty fixed argv fails before process creation', () => {
  assert.throws(
    () => assertFixedLauncherArgumentVector([]),
    /fixed argument vector is empty/
  );
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

test('macOS uses the identical POSIX executable and argv architecture', () => {
  const launcher = resolvePinnedPackageManagerLauncher({
    platform: 'darwin',
    pathValue: '/opt/homebrew/bin:/usr/bin',
    execPath: '/usr/bin/node',
    exists: (path) => path === '/opt/homebrew/bin/corepack',
    realpath: (path) => path
  });
  assert.deepEqual(launcher, {
    program: '/opt/homebrew/bin/corepack',
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
