import { existsSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import {
  assertDatabaseOperationAllowed,
  formatDatabaseSafetyError,
  formatSafeDatabaseIdentity
} from '../lib/database-safety';
import { FakeCredentialDeliveryAdapter } from '../lib/credential-delivery';
import {
  executeTenantProvisioning,
  planTenantProvisioning,
  TenantProvisioningError,
  validateTenantProvisioningInput,
  type TenantProvisioningInput
} from '../lib/tenant-provisioning';

type CommandOptions = {
  inputPath?: string;
  execute: boolean;
  help: boolean;
};

const HELP = `Usage: pnpm tenant:provision -- --input <ignored-file.json> [--dry-run | --execute]

Defaults to --dry-run. Input is non-secret JSON and must be stored in a Git-ignored
file inside this repository. Passwords and credentials are never accepted as command
arguments or input fields.

Options:
  --input <path>  Approved non-secret provisioning input file
  --dry-run       Validate, check conflicts, and print a write-free plan (default)
  --execute       Execute only with an explicitly configured delivery adapter
  --help          Show this help without accessing a database

Execution delivery configuration:
  TENANT_PROVISIONING_DELIVERY_ADAPTER=fake is test-only and accepted only in
  development or test. No Production delivery adapter is implemented in this PR.`;

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
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--dry-run') {
      if (selectedMode === 'execute') throw new Error('--dry-run and --execute cannot be combined.');
      selectedMode = 'dry-run';
      options.execute = false;
    } else if (argument === '--execute') {
      if (selectedMode === 'dry-run') throw new Error('--dry-run and --execute cannot be combined.');
      selectedMode = 'execute';
      options.execute = true;
    }
    else if (argument === '--input') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--input requires a file path.');
      options.inputPath = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function readApprovedInput(inputPath: string): TenantProvisioningInput {
  const repositoryRoot = resolve(process.cwd());
  const absolutePath = resolve(repositoryRoot, inputPath);
  const repositoryRelativePath = relative(repositoryRoot, absolutePath);
  if (
    !repositoryRelativePath ||
    repositoryRelativePath.startsWith('..') ||
    resolve(repositoryRoot, repositoryRelativePath) !== absolutePath
  ) {
    throw new Error('The input file must be inside this repository.');
  }
  if (!absolutePath.toLowerCase().endsWith('.json') || !existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new Error('The input path must identify an existing JSON file.');
  }
  const ignored = spawnSync('git', ['check-ignore', '--quiet', '--', repositoryRelativePath], {
    cwd: repositoryRoot,
    stdio: 'ignore'
  });
  if (ignored.status !== 0) {
    throw new Error('The approved input JSON file must be ignored by Git.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch {
    throw new Error('The approved input file must contain valid JSON.');
  }
  return parsed as TenantProvisioningInput;
}

function deliveryAdapterFor(environment: string) {
  const configured = process.env.TENANT_PROVISIONING_DELIVERY_ADAPTER?.trim().toLowerCase();
  if (!configured) return undefined;
  if (configured === 'fake' && ['development', 'test'].includes(environment)) {
    return new FakeCredentialDeliveryAdapter();
  }
  throw new TenantProvisioningError(
    'DELIVERY_NOT_CONFIGURED',
    'No approved credential delivery adapter is configured for this environment.'
  );
}

function loginUrlFor(environment: string) {
  const value = process.env.TENANT_PROVISIONING_LOGIN_URL?.trim();
  if (!value) {
    throw new TenantProvisioningError(
      'DELIVERY_NOT_CONFIGURED',
      'TENANT_PROVISIONING_LOGIN_URL is required for execution.'
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TenantProvisioningError('DELIVERY_NOT_CONFIGURED', 'The configured login URL is invalid.');
  }
  const localDevelopmentUrl = ['development', 'test'].includes(environment) && parsed.hostname === 'localhost';
  if ((parsed.protocol !== 'https:' && !localDevelopmentUrl) || parsed.username || parsed.password) {
    throw new TenantProvisioningError('DELIVERY_NOT_CONFIGURED', 'The configured login URL is unsafe.');
  }
  return parsed.toString();
}

function safeErrorPayload(error: unknown) {
  if (error instanceof TenantProvisioningError) {
    return { ok: false, error: { code: error.code, message: error.message, ...error.details } };
  }
  return { ok: false, error: { code: 'COMMAND_FAILED', message: 'Tenant provisioning failed safely.' } };
}

function exitCodeFor(error: unknown) {
  if (!(error instanceof TenantProvisioningError)) return 4;
  if (error.code === 'INPUT_INVALID') return 2;
  if (error.code === 'PROVISIONING_CONFLICT') return 3;
  if (error.code === 'TRANSACTION_FAILED') return 5;
  if (error.code === 'DELIVERY_FAILED') return 6;
  return 4;
}

async function main() {
  let options: CommandOptions;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(JSON.stringify(safeErrorPayload(error)));
    process.exit(2);
  }
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (!options.inputPath) {
    console.error(JSON.stringify({ ok: false, error: { code: 'INPUT_REQUIRED', message: '--input is required.' } }));
    process.exit(2);
  }

  loadLocalEnvironment();
  let input: ReturnType<typeof validateTenantProvisioningInput>;
  try {
    input = validateTenantProvisioningInput(readApprovedInput(options.inputPath));
  } catch (error) {
    console.error(JSON.stringify(safeErrorPayload(error)));
    process.exit(error instanceof TenantProvisioningError ? exitCodeFor(error) : 2);
  }

  if (process.env.APP_ENV?.trim().toLowerCase() !== input.environment) {
    console.error(
      JSON.stringify({
        ok: false,
        error: { code: 'ENVIRONMENT_MISMATCH', message: 'Approved input and application environment do not match.' }
      })
    );
    process.exit(4);
  }

  let guarded;
  try {
    guarded = assertDatabaseOperationAllowed({
      operation: options.execute ? 'pilot-provision' : 'read-only-diagnostic',
      appEnvironment: process.env.APP_ENV,
      databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
      databaseUrl: process.env.DATABASE_URL,
      expectedFingerprint: process.env.DATABASE_FINGERPRINT,
      productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
      branchId: process.env.DATABASE_BRANCH_ID,
      productionProvisioningAcknowledgement: process.env.ACKNOWLEDGE_PRODUCTION_PROVISIONING,
      productionProvisioningChangeId: process.env.PRODUCTION_PROVISION_CHANGE_ID
    });
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: { code: 'DATABASE_GUARD_DENIED', message: formatDatabaseSafetyError(error) } }));
    process.exit(4);
  }

  const environment = {
    application: guarded.appEnvironment,
    database: guarded.databaseEnvironment,
    identity: formatSafeDatabaseIdentity(guarded.identity)
  };
  const db = new PrismaClient();
  try {
    if (!options.execute) {
      const plan = await planTenantProvisioning(db, input);
      console.log(JSON.stringify({ ok: plan.safeToExecute, mode: 'dry-run', environment, plan }, null, 2));
      process.exitCode = plan.safeToExecute ? 0 : 3;
      return;
    }
    if (guarded.targetsProduction) {
      throw new TenantProvisioningError(
        'DELIVERY_NOT_CONFIGURED',
        'Production execution is unavailable until an approved real delivery adapter is implemented.'
      );
    }
    const result = await executeTenantProvisioning({
      db,
      input,
      deliveryAdapter: deliveryAdapterFor(input.environment),
      loginUrl: loginUrlFor(input.environment)
    });
    console.log(JSON.stringify({ ok: true, mode: 'execute', environment, result }, null, 2));
  } catch (error) {
    console.error(JSON.stringify(safeErrorPayload(error), null, 2));
    process.exitCode = exitCodeFor(error);
  } finally {
    await db.$disconnect();
  }
}

void main();
