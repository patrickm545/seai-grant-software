import { existsSync, realpathSync } from 'node:fs';
import { posix, win32 } from 'node:path';
import {
  spawnSync,
  type SpawnSyncOptionsWithStringEncoding,
  type SpawnSyncReturns
} from 'node:child_process';

export const PINNED_PACKAGE_MANAGER = 'pnpm@10.11.0' as const;
export const FIXED_PRODUCTION_EVIDENCE_SCRIPT =
  'db:lineage:capture-production-evidence' as const;
export const FIXED_LAUNCHER_SMOKE_SCRIPT = 'launcher:smoke:target' as const;
export const FIXED_LAUNCHER_SMOKE_ARGUMENT = '--fixed-launcher-smoke-v1' as const;
export const FIXED_LAUNCHER_SMOKE_MARKER = 'fixed-launcher-smoke-ok/v1' as const;

const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export type ResolvedPackageManagerLauncher = {
  program: string;
  prefixArguments: string[];
  shell: false;
  mechanism: 'windows-node-corepack-entrypoint' | 'posix-corepack-executable';
};

type Spawn = (
  program: string,
  arguments_: readonly string[],
  options: SpawnSyncOptionsWithStringEncoding
) => SpawnSyncReturns<string>;

export type PackageManagerLauncherDependencies = {
  platform?: NodeJS.Platform;
  pathValue?: string;
  execPath?: string;
  exists?: (path: string) => boolean;
  realpath?: (path: string) => string;
  spawn?: Spawn;
};

export type PackageManagerLaunchOptions = PackageManagerLauncherDependencies & {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

function exactSafeArgument(value: string, label: string) {
  if (!value || controlCharacterPattern.test(value)) {
    throw new Error(`${label} contains an unsupported control character.`);
  }
  return value;
}

export function assertFixedLauncherArgumentVector(arguments_: readonly string[]) {
  if (!arguments_.length) {
    throw new Error('FIXED_LAUNCHER_UNSAFE: fixed argument vector is empty.');
  }
  return arguments_.map((argument, index) =>
    exactSafeArgument(argument, `Fixed launcher argument ${index}`)
  );
}

function uniqueExistingCandidates(input: {
  pathValue: string;
  platform: NodeJS.Platform;
  filename: string;
  exists: (path: string) => boolean;
  realpath: (path: string) => string;
}) {
  const pathApi = input.platform === 'win32' ? win32 : posix;
  const candidates = input.pathValue
    .split(pathApi.delimiter)
    .map((entry) => entry.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
    .map((entry) => pathApi.join(entry, input.filename))
    .filter((candidate) => input.exists(candidate))
    .map((candidate) => input.realpath(candidate));
  return [...new Map(candidates.map((candidate) => [
    input.platform === 'win32' ? candidate.toLocaleLowerCase() : candidate,
    candidate
  ])).values()];
}

export function resolvePinnedPackageManagerLauncher(
  dependencies: PackageManagerLauncherDependencies = {}
): ResolvedPackageManagerLauncher {
  const platform = dependencies.platform ?? process.platform;
  const pathValue = dependencies.pathValue ?? process.env.PATH ?? '';
  const exists = dependencies.exists ?? existsSync;
  const realpath = dependencies.realpath ?? realpathSync;
  const execPath = dependencies.execPath ?? process.execPath;
  const pathApi = platform === 'win32' ? win32 : posix;

  if (platform === 'win32') {
    const shims = uniqueExistingCandidates({
      pathValue,
      platform,
      filename: 'corepack.cmd',
      exists,
      realpath
    });
    if (shims.length !== 1) {
      throw new Error(
        `FIXED_LAUNCHER_UNSAFE: expected one Windows Corepack shim; found ${shims.length}.`
      );
    }
    const corepackEntrypoint = pathApi.join(
      pathApi.dirname(shims[0]),
      'node_modules',
      'corepack',
      'dist',
      'corepack.js'
    );
    if (!exists(corepackEntrypoint)) {
      throw new Error('FIXED_LAUNCHER_UNSAFE: Windows Corepack JavaScript entrypoint is unavailable.');
    }
    const resolvedShim = exactSafeArgument(shims[0], 'Resolved Corepack shim');
    const resolvedEntrypoint = exactSafeArgument(
      realpath(corepackEntrypoint),
      'Resolved Corepack entrypoint'
    );
    if (
      pathApi.basename(resolvedShim).toLocaleLowerCase() !== 'corepack.cmd' ||
      pathApi.basename(resolvedEntrypoint).toLocaleLowerCase() !== 'corepack.js'
    ) {
      throw new Error('FIXED_LAUNCHER_UNSAFE: Windows Corepack resolution is unexpected.');
    }
    if (!exists(execPath)) {
      throw new Error('FIXED_LAUNCHER_UNSAFE: Node executable is unavailable.');
    }
    const resolvedNode = exactSafeArgument(realpath(execPath), 'Resolved Node executable');
    if (pathApi.basename(resolvedNode).toLocaleLowerCase() !== 'node.exe') {
      throw new Error('FIXED_LAUNCHER_UNSAFE: Node executable resolution is unexpected.');
    }
    return {
      program: resolvedNode,
      prefixArguments: [resolvedEntrypoint, PINNED_PACKAGE_MANAGER],
      shell: false,
      mechanism: 'windows-node-corepack-entrypoint'
    };
  }

  const executables = uniqueExistingCandidates({
    pathValue,
    platform,
    filename: 'corepack',
    exists,
    realpath
  });
  if (executables.length !== 1 || pathApi.basename(executables[0]) !== 'corepack') {
    throw new Error(
      `FIXED_LAUNCHER_UNSAFE: expected one POSIX Corepack executable; found ${executables.length}.`
    );
  }
  return {
    program: executables[0],
    prefixArguments: [PINNED_PACKAGE_MANAGER],
    shell: false,
    mechanism: 'posix-corepack-executable'
  };
}

function launchFixedArguments(
  arguments_: readonly string[],
  options: PackageManagerLaunchOptions = {}
) {
  const launcher = resolvePinnedPackageManagerLauncher(options);
  const spawn = options.spawn ?? spawnSync;
  const safeProgram = exactSafeArgument(launcher.program, 'Fixed launcher program');
  const fixedArguments = assertFixedLauncherArgumentVector(arguments_);
  const safeArguments = [...launcher.prefixArguments, ...fixedArguments].map(
    (argument, index) => exactSafeArgument(argument, `Resolved launcher argument ${index}`)
  );
  const result = spawn(safeProgram, safeArguments, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    windowsHide: true
  });
  if (result.error) {
    const code =
      typeof (result.error as NodeJS.ErrnoException).code === 'string'
        ? (result.error as NodeJS.ErrnoException).code
        : 'UNKNOWN';
    throw new Error(`FIXED_LAUNCHER_FAILED: process launch failed with code ${code}.`);
  }
  return {
    launcher,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

export function launchFixedProductionEvidenceCapture(
  options: PackageManagerLaunchOptions = {}
) {
  return launchFixedArguments(
    ['--silent', 'run', FIXED_PRODUCTION_EVIDENCE_SCRIPT],
    options
  );
}

export function launchHarmlessPackageManagerVersionProbe(
  options: PackageManagerLaunchOptions = {}
) {
  return launchFixedArguments(['--version'], options);
}

export function launchFixedLauncherSmoke(
  options: PackageManagerLaunchOptions = {}
) {
  return launchFixedArguments(
    ['--silent', 'run', FIXED_LAUNCHER_SMOKE_SCRIPT],
    options
  );
}
