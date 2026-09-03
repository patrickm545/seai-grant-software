import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { posix, resolve, win32 } from 'node:path';
import {
  assertFixedLauncherArgumentVector,
  resolveFixedNodeExecutable
} from './fixed-package-script-launcher';
import type { VerifierMode } from './lineage-verifier';
import { environmentWithDatabaseCredential } from './database-credential-env';

export const FIXED_DATABASE_LAUNCHER_SMOKE_ARGUMENT =
  '--fixed-database-launcher-smoke-v1' as const;
export const FIXED_DATABASE_LAUNCHER_SMOKE_MARKER =
  'fixed-database-launcher-smoke-ok/v1' as const;

export type FixedPrismaCommand =
  | 'migrate-deploy'
  | 'migrate-dev'
  | 'migrate-reset';

type Spawn = (
  program: string,
  arguments_: readonly string[],
  options: SpawnSyncOptions
) => SpawnSyncReturns<Buffer>;

export type FixedDatabaseLauncherDependencies = {
  platform?: NodeJS.Platform;
  execPath?: string;
  repositoryRoot?: string;
  exists?: (path: string) => boolean;
  realpath?: (path: string) => string;
  readFile?: (path: string) => string;
  spawn?: Spawn;
};

export type FixedDatabaseLaunchOptions = FixedDatabaseLauncherDependencies & {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  captureOutput?: boolean;
};

export type FixedGuardedDatabaseCommand =
  | 'status'
  | 'migrate-test'
  | 'migrate-production'
  | 'post-migration-production-evidence';

export type FixedCredentialDatabaseLaunchOptions = FixedDatabaseLaunchOptions & {
  loadCredentialEnvironment?: (
    baseEnvironment: NodeJS.ProcessEnv,
    filePath: string
  ) => NodeJS.ProcessEnv;
};

const verifierModes = new Set<VerifierMode>([
  'strict-status',
  'strict-preflight',
  'strict-postflight',
  'production-status',
  'production-preflight',
  'production-postflight'
]);

const prismaArguments: Record<FixedPrismaCommand, readonly string[]> = {
  'migrate-deploy': ['migrate', 'deploy'],
  'migrate-dev': ['migrate', 'dev'],
  'migrate-reset': ['migrate', 'reset']
};

const guardedDatabaseCommands = new Set<FixedGuardedDatabaseCommand>([
  'status',
  'migrate-test',
  'migrate-production',
  'post-migration-production-evidence'
]);

function safeLaunchError(error: Error) {
  const code = typeof (error as NodeJS.ErrnoException).code === 'string'
    ? (error as NodeJS.ErrnoException).code
    : 'UNKNOWN';
  return new Error(`FIXED_DATABASE_LAUNCHER_FAILED: process launch failed with code ${code}.`);
}

function resolveRepositoryFile(
  repositoryRoot: string,
  relativePath: string,
  dependencies: FixedDatabaseLauncherDependencies
) {
  const exists = dependencies.exists ?? existsSync;
  const realpath = dependencies.realpath ?? realpathSync;
  const pathApi = (dependencies.platform ?? process.platform) === 'win32' ? win32 : posix;
  const candidate = pathApi.resolve(repositoryRoot, relativePath);
  if (!exists(candidate)) {
    throw new Error('FIXED_DATABASE_LAUNCHER_UNSAFE: fixed repository entrypoint is unavailable.');
  }
  return realpath(candidate);
}

export function resolveFixedPrismaEntrypoint(
  dependencies: FixedDatabaseLauncherDependencies = {}
) {
  const repositoryRoot = dependencies.repositoryRoot ?? resolve(__dirname, '..');
  const pathApi = (dependencies.platform ?? process.platform) === 'win32' ? win32 : posix;
  const entrypoint = resolveRepositoryFile(
    repositoryRoot,
    'node_modules/prisma/build/index.js',
    dependencies
  );
  const packagePath = pathApi.resolve(
    pathApi.dirname(pathApi.dirname(entrypoint)),
    'package.json'
  );
  const exists = dependencies.exists ?? existsSync;
  if (!exists(packagePath) || pathApi.basename(entrypoint).toLocaleLowerCase() !== 'index.js') {
    throw new Error('FIXED_DATABASE_LAUNCHER_UNSAFE: Prisma CLI resolution is unexpected.');
  }
  const readFile = dependencies.readFile ?? ((path: string) => readFileSync(path, 'utf8'));
  let packageJson: { name?: string };
  try {
    packageJson = JSON.parse(readFile(packagePath)) as { name?: string };
  } catch {
    throw new Error('FIXED_DATABASE_LAUNCHER_UNSAFE: Prisma CLI package identity is unreadable.');
  }
  if (packageJson.name !== 'prisma') {
    throw new Error('FIXED_DATABASE_LAUNCHER_UNSAFE: Prisma CLI package identity is unexpected.');
  }
  return entrypoint;
}

function launchFixedNodeArguments(
  arguments_: readonly string[],
  options: FixedDatabaseLaunchOptions = {}
) {
  const node = resolveFixedNodeExecutable(options);
  const safeArguments = assertFixedLauncherArgumentVector(arguments_);
  const spawn: Spawn = options.spawn ?? ((program, argv, spawnOptions) =>
    spawnSync(program, argv, spawnOptions) as SpawnSyncReturns<Buffer>);
  const captureOutput = options.captureOutput === true;
  const result = spawn(node, safeArguments, {
    cwd: options.cwd ?? options.repositoryRoot ?? process.cwd(),
    env: options.env ?? process.env,
    shell: false,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    ...(captureOutput ? {} : { stdio: 'inherit' })
  });
  if (result.error) throw safeLaunchError(result.error);
  return {
    program: node,
    arguments: safeArguments,
    shell: false as const,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? Buffer.alloc(0),
    stderr: result.stderr ?? Buffer.alloc(0)
  };
}

export function launchFixedLineageVerifier(
  mode: VerifierMode,
  options: FixedDatabaseLaunchOptions = {}
) {
  if (!verifierModes.has(mode)) {
    throw new Error('FIXED_DATABASE_LAUNCHER_UNSAFE: unexpected verifier mode.');
  }
  const repositoryRoot = options.repositoryRoot ?? resolve(__dirname, '..');
  const script = resolveRepositoryFile(
    repositoryRoot,
    'scripts/verify-migration-lineage.ts',
    options
  );
  return launchFixedNodeArguments(['--import', 'tsx', script, mode], {
    ...options,
    repositoryRoot
  });
}

export function launchFixedPrismaCommand(
  command: FixedPrismaCommand,
  options: FixedDatabaseLaunchOptions = {}
) {
  const fixedArguments = prismaArguments[command];
  if (!fixedArguments) {
    throw new Error('FIXED_DATABASE_LAUNCHER_UNSAFE: unexpected Prisma command.');
  }
  const repositoryRoot = options.repositoryRoot ?? resolve(__dirname, '..');
  const prisma = resolveFixedPrismaEntrypoint({ ...options, repositoryRoot });
  return launchFixedNodeArguments([prisma, ...fixedArguments], {
    ...options,
    repositoryRoot
  });
}

export function launchFixedSeed(options: FixedDatabaseLaunchOptions = {}) {
  const repositoryRoot = options.repositoryRoot ?? resolve(__dirname, '..');
  const seed = resolveRepositoryFile(repositoryRoot, 'prisma/seed.ts', options);
  return launchFixedNodeArguments(['--import', 'tsx', seed], {
    ...options,
    repositoryRoot
  });
}

export function launchFixedDatabaseLauncherSmoke(
  options: FixedDatabaseLaunchOptions = {}
) {
  const repositoryRoot = options.repositoryRoot ?? resolve(__dirname, '..');
  const target = resolveRepositoryFile(
    repositoryRoot,
    'scripts/fixed-database-launcher-smoke-target.ts',
    options
  );
  return launchFixedNodeArguments(
    ['--import', 'tsx', target, FIXED_DATABASE_LAUNCHER_SMOKE_ARGUMENT],
    { ...options, repositoryRoot, captureOutput: true }
  );
}

export function launchFixedPostMigrationProductionEvidenceCaptureRaw(
  options: FixedDatabaseLaunchOptions = {}
) {
  const repositoryRoot = options.repositoryRoot ?? resolve(__dirname, '..');
  const script = resolveRepositoryFile(
    repositoryRoot,
    'scripts/capture-post-migration-production-evidence.ts',
    options
  );
  return launchFixedNodeArguments(['--import', 'tsx', script], {
    ...options,
    repositoryRoot,
    captureOutput: true
  });
}

export function launchFixedGuardedDatabaseCommandFromEnvFile(
  command: FixedGuardedDatabaseCommand,
  credentialFile: string,
  options: FixedCredentialDatabaseLaunchOptions = {}
) {
  if (!guardedDatabaseCommands.has(command)) {
    throw new Error('FIXED_DATABASE_LAUNCHER_UNSAFE: unexpected guarded database command.');
  }
  const repositoryRoot = options.repositoryRoot ?? resolve(__dirname, '..');
  const postMigrationEvidence = command === 'post-migration-production-evidence';
  const script = resolveRepositoryFile(
    repositoryRoot,
    postMigrationEvidence
      ? 'scripts/launch-post-migration-production-evidence.ts'
      : 'scripts/run-database-command.ts',
    options
  );
  const loadEnvironment =
    options.loadCredentialEnvironment ?? environmentWithDatabaseCredential;
  const environment = loadEnvironment(options.env ?? process.env, credentialFile);
  return launchFixedNodeArguments(
    postMigrationEvidence
      ? ['--import', 'tsx', script]
      : ['--import', 'tsx', script, command],
    {
    ...options,
    repositoryRoot,
    env: environment
    }
  );
}
