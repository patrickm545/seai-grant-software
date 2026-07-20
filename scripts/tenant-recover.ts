import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import {
  assertDatabaseOperationAllowed
} from '../lib/database-safety';
import { FakeCredentialDeliveryAdapter } from '../lib/credential-delivery';

type RecoverySubcommand =
  | 'inspect'
  | 'reissue-credential'
  | 'suspend-user'
  | 'suspend-organisation'
  | 'reactivate';

type CommandOptions = {
  subcommand?: RecoverySubcommand;
  inputPath?: string;
  execute: boolean;
  help: boolean;
};

type RecoveryInput = Record<string, unknown>;

const HELP = `Usage: pnpm tenant:recover <subcommand> --input <ignored-file.json> [--dry-run | --execute]

Subcommands:
  inspect                 Inspect a tenant and classify its safe recovery state
  reissue-credential     Reissue an expired/failed temporary credential
  suspend-user           Suspend the positively identified owner user
  suspend-organisation   Suspend the positively identified installer organisation
  reactivate             Reactivate one approved user or organisation state (input targetType: user|organisation)

All mutations default to --dry-run. --execute is required to write. Input is
non-secret JSON in a Git-ignored file inside this repository; plaintext
credentials, hashes, tokens, cookies, database URLs, and environment secrets
are rejected. Production execution is unavailable.

Options:
  --input <path>  Approved non-secret recovery input JSON
  --dry-run       Inspect/plan without writes (default)
  --execute       Execute the reviewed, idempotent operation
  --help          Show this help without loading a database`;

const SAFE_ERROR_CODES = new Set([
  'INPUT_INVALID',
  'INPUT_REQUIRED',
  'DATABASE_GUARD_DENIED',
  'RECOVERY_NOT_AVAILABLE',
  'RECOVERY_REFUSED',
  'APPROVER_NOT_AUTHORISED',
  'TARGET_NOT_FOUND',
  'IDEMPOTENCY_KEY_MISMATCH',
  'IDEMPOTENCY_OPERATION_INCOMPLETE',
  'DELIVERY_FAILED',
  'TRANSACTION_FAILED',
  'PRODUCTION_DISABLED',
  'RECOVERY_FAILED',
  'PRODUCTION_EXECUTION_DISABLED'
]);

function loadLocalEnvironment() {
  if (process.env.DATABASE_URL || !existsSync('.env')) return;
  for (const rawLine of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArguments(argv: string[]): CommandOptions {
  const options: CommandOptions = { execute: false, help: false };
  let selectedMode: 'dry-run' | 'execute' | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--dry-run') {
      if (selectedMode === 'execute') throw new Error('--dry-run and --execute cannot be combined.');
      selectedMode = 'dry-run';
      options.execute = false;
      continue;
    }
    if (argument === '--execute') {
      if (selectedMode === 'dry-run') throw new Error('--dry-run and --execute cannot be combined.');
      selectedMode = 'execute';
      options.execute = true;
      continue;
    }
    if (argument === '--input') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--input requires a file path.');
      options.inputPath = value;
      index += 1;
      continue;
    }
    if (!options.subcommand && !argument.startsWith('-')) {
      if (!['inspect', 'reissue-credential', 'suspend-user', 'suspend-organisation', 'reactivate'].includes(argument)) {
        throw new Error(`Unknown recovery subcommand: ${argument}`);
      }
      options.subcommand = argument as RecoverySubcommand;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function isSensitiveKey(key: string) {
  return /(plaintext|password|credential|hash|token|cookie|authorization|database|connection|string|api[-_]?key|provider[-_]?secret)/i.test(key);
}

function assertSecretFreeInput(value: unknown, path = 'input') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFreeInput(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveKey(key) || /temporarycredential/i.test(key)) {
      throw new Error(`Secret material is not accepted in ${path}.${key}.`);
    }
    assertSecretFreeInput(child, `${path}.${key}`);
  }
}

function readApprovedInput(inputPath: string): RecoveryInput {
  const repositoryRoot = realpathSync(resolve(process.cwd()));
  const absolutePath = resolve(repositoryRoot, inputPath);
  const repositoryRelativePath = relative(repositoryRoot, absolutePath);
  if (!repositoryRelativePath || repositoryRelativePath.startsWith('..')) {
    throw new Error('The input file must be inside this repository.');
  }
  if (!absolutePath.toLowerCase().endsWith('.json') || !existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new Error('The input path must identify an existing JSON file.');
  }
  const realInputPath = realpathSync(absolutePath);
  const realRelativePath = relative(repositoryRoot, realInputPath);
  if (!realRelativePath || realRelativePath.startsWith('..') || /^[A-Za-z]:[\\/]/.test(realRelativePath)) {
    throw new Error('The input file must resolve inside this repository.');
  }
  const ignored = spawnSync('git', ['check-ignore', '--quiet', '--', repositoryRelativePath], {
    cwd: repositoryRoot,
    stdio: 'ignore'
  });
  if (ignored.status !== 0) throw new Error('The approved input JSON file must be ignored by Git.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch {
    throw new Error('The approved input file must contain valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The approved input must be a JSON object.');
  }
  assertSecretFreeInput(parsed);
  return parsed as RecoveryInput;
}

function safeErrorPayload(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && SAFE_ERROR_CODES.has(error.code)) {
    return { ok: false, error: { code: error.code, message: 'Recovery command was refused or failed safely.' } };
  }
  if (error instanceof Error && error.message.includes('Secret material')) {
    return { ok: false, error: { code: 'INPUT_INVALID', message: 'Recovery input contains forbidden secret material.' } };
  }
  return { ok: false, error: { code: 'RECOVERY_FAILED', message: 'Tenant recovery failed safely.' } };
}

function scrubSafeOutput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubSafeOutput);
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveKey(key) || /temporarycredential/i.test(key)) continue;
    output[key] = scrubSafeOutput(child);
  }
  return output;
}

async function invokeRecovery(db: PrismaClient, options: CommandOptions, input: RecoveryInput, environment: string) {
  const service = await import('../lib/tenant-recovery');
  const organisationId = input.organisationId;
  if (typeof organisationId !== 'string' || !organisationId.trim()) {
    throw new Error('organisationId is required.');
  }
  if (options.subcommand === 'inspect') {
    return service.inspectTenantRecovery({ db, organisationId });
  }

  const approverUserId = input.approverUserId;
  const idempotencyKey = input.idempotencyKey;
  const reason = input.reason;
  if (typeof approverUserId !== 'string' || typeof idempotencyKey !== 'string' || typeof reason !== 'string') {
    throw new Error('approverUserId, idempotencyKey, and reason are required for mutations.');
  }
  const recoveryInput = {
    organisationId,
    installerId: typeof input.installerId === 'string' ? input.installerId : undefined,
    ownerUserId: typeof input.ownerUserId === 'string' ? input.ownerUserId : undefined,
    approverUserId,
    idempotencyKey,
    reason,
    environment: environment as 'development' | 'test' | 'preview' | 'production',
    targetType: input.targetType === 'organisation' ? 'organisation' as const : input.targetType === 'user' ? 'user' as const : undefined,
    loginUrl: typeof input.loginUrl === 'string' ? input.loginUrl : undefined
  };
  if (options.execute && !['development', 'test'].includes(environment)) {
    const error = new Error('Only Development and test recovery execution is enabled.') as Error & { code?: string };
    error.code = 'PRODUCTION_EXECUTION_DISABLED';
    throw error;
  }

  const deliveryAdapter = options.execute ? new FakeCredentialDeliveryAdapter() : undefined;
  if (options.subcommand === 'reissue-credential') {
    return options.execute
      ? service.reissueTenantCredential({ db, input: recoveryInput, deliveryAdapter: deliveryAdapter! })
      : service.planTenantCredentialReissue({ db, input: recoveryInput });
  }
  if (options.subcommand === 'suspend-user') {
    return options.execute
      ? service.suspendTenantUser({ db, input: recoveryInput })
      : service.planTenantUserSuspension({ db, input: recoveryInput });
  }
  if (options.subcommand === 'suspend-organisation') {
    return options.execute
      ? service.suspendTenantOrganisation({ db, input: recoveryInput })
      : service.planTenantOrganisationSuspension({ db, input: recoveryInput });
  }

  const targetType = input.targetType;
  if (targetType === 'user') {
    return options.execute
      ? service.reactivateTenantUser({ db, input: recoveryInput })
      : service.planTenantUserReactivation({ db, input: recoveryInput });
  }
  if (targetType === 'organisation') {
    return options.execute
      ? service.reactivateTenantOrganisation({ db, input: recoveryInput })
      : service.planTenantOrganisationReactivation({ db, input: recoveryInput });
  }
  throw new Error('reactivate requires targetType set to user or organisation.');
}

async function main() {
  let options: CommandOptions;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: { code: 'INPUT_INVALID', message: error instanceof Error ? error.message : 'Invalid command.' } }));
    process.exit(2);
    return;
  }
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (!options.subcommand) {
    console.error(JSON.stringify({ ok: false, error: { code: 'INPUT_REQUIRED', message: 'A recovery subcommand is required.' } }));
    process.exit(2);
    return;
  }
  if (!options.inputPath) {
    console.error(JSON.stringify({ ok: false, error: { code: 'INPUT_REQUIRED', message: '--input is required.' } }));
    process.exit(2);
    return;
  }

  loadLocalEnvironment();
  let input: RecoveryInput;
  try {
    input = readApprovedInput(options.inputPath);
  } catch (error) {
    console.error(JSON.stringify(safeErrorPayload(error)));
    process.exit(2);
    return;
  }

  let guarded;
  try {
    guarded = assertDatabaseOperationAllowed({
      operation: options.execute ? 'one-off-mutation' : 'read-only-diagnostic',
      appEnvironment: process.env.APP_ENV,
      databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
      databaseUrl: process.env.DATABASE_URL,
      expectedFingerprint: process.env.DATABASE_FINGERPRINT,
      productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
      branchId: process.env.DATABASE_BRANCH_ID
    });
  } catch {
    console.error(JSON.stringify({ ok: false, error: { code: 'DATABASE_GUARD_DENIED', message: 'Database safety guard denied the requested operation.' } }));
    process.exit(4);
    return;
  }

  if (options.execute && guarded.targetsProduction) {
    console.error(JSON.stringify({ ok: false, error: { code: 'PRODUCTION_EXECUTION_DISABLED', message: 'Production recovery execution is disabled.' } }));
    process.exit(4);
    return;
  }

  // Report only environment classifications. Host, database name, and
  // fingerprints are intentionally not part of recovery command output.
  const environment = {
    application: guarded.appEnvironment,
    database: guarded.databaseEnvironment
  };
  const db = new PrismaClient();
  try {
    const result = await invokeRecovery(db, options, input, guarded.appEnvironment);
    console.log(JSON.stringify(scrubSafeOutput({ ok: true, mode: options.execute ? 'execute' : 'dry-run', environment, result }), null, 2));
  } catch (error) {
    console.error(JSON.stringify(safeErrorPayload(error), null, 2));
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    process.exitCode = code === 'INPUT_INVALID' || code === 'INPUT_REQUIRED' ? 2 : code === 'TRANSACTION_FAILED' ? 5 : code === 'DELIVERY_FAILED' ? 6 : 4;
  } finally {
    await db.$disconnect();
  }
}

void main();
