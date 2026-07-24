import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { assertDatabaseOperationAllowed } from '../lib/database-safety';
import { readConfirmedHiddenCredential } from '../lib/secure-credential-input';
import {
  executeProductionLegacyCredentialReissue,
  planProductionLegacyCredentialReissue,
  TenantRecoveryError,
  type ProductionLegacyCredentialReissueInput
} from '../lib/tenant-recovery';

type CommandOptions = {
  inputPath?: string;
  execute: boolean;
  confirmProduction: boolean;
  planReference?: string;
  help: boolean;
};

const HELP = `Usage: pnpm tenant:recover:production-credential -- --input <ignored-file.json> [--dry-run | --execute --confirm-production --plan-reference <reference>]

The input JSON contains only:
  email, operatorUserId, idempotencyKey, reason, environment="production"

Dry-run is read-only and emits a secret-free plan. Execution requires the
exact prior plan reference, the Production database guard, an approved change
identifier, the exact acknowledgement, and hidden interactive credential input.
Passwords, hashes, tokens, database URLs, and credentials are rejected from
the JSON input and are never accepted as command-line arguments.`;

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
  const options: CommandOptions = {
    execute: false,
    confirmProduction: false,
    help: false
  };
  let selectedMode: 'dry-run' | 'execute' | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--dry-run') {
      if (selectedMode === 'execute') throw new Error('Execution mode is ambiguous.');
      selectedMode = 'dry-run';
    } else if (argument === '--execute') {
      if (selectedMode === 'dry-run') throw new Error('Execution mode is ambiguous.');
      selectedMode = 'execute';
      options.execute = true;
    } else if (argument === '--confirm-production') options.confirmProduction = true;
    else if (argument === '--input' || argument === '--plan-reference') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      if (argument === '--input') options.inputPath = value;
      else options.planReference = value;
      index += 1;
    } else {
      throw new Error('Unknown command argument.');
    }
  }
  return options;
}

function isSensitiveKey(key: string) {
  return /(plaintext|password|credential|hash|token|cookie|authorization|database|connection|api[-_]?key|secret)/i.test(
    key
  );
}

function readApprovedInput(inputPath: string): ProductionLegacyCredentialReissueInput {
  const repositoryRoot = realpathSync(resolve(process.cwd()));
  const absolutePath = resolve(repositoryRoot, inputPath);
  const repositoryRelativePath = relative(repositoryRoot, absolutePath);
  if (
    !repositoryRelativePath ||
    repositoryRelativePath.startsWith('..') ||
    !absolutePath.toLowerCase().endsWith('.json') ||
    !existsSync(absolutePath) ||
    !statSync(absolutePath).isFile()
  ) {
    throw new Error('The input must be an existing JSON file inside the repository.');
  }
  if (
    spawnSync('git', ['check-ignore', '--quiet', '--', repositoryRelativePath], {
      cwd: repositoryRoot,
      stdio: 'ignore'
    }).status !== 0
  ) {
    throw new Error('The input JSON must be ignored by Git.');
  }
  const parsed = JSON.parse(readFileSync(absolutePath, 'utf8')) as Record<string, unknown>;
  if (!parsed || Array.isArray(parsed) || Object.keys(parsed).some(isSensitiveKey)) {
    throw new Error('The input JSON contains unsupported or sensitive fields.');
  }
  const allowed = new Set(['email', 'operatorUserId', 'idempotencyKey', 'reason', 'environment']);
  if (Object.keys(parsed).some((key) => !allowed.has(key))) {
    throw new Error('The input JSON contains an unsupported field.');
  }
  if (
    typeof parsed.email !== 'string' ||
    typeof parsed.operatorUserId !== 'string' ||
    typeof parsed.idempotencyKey !== 'string' ||
    typeof parsed.reason !== 'string' ||
    parsed.environment !== 'production'
  ) {
    throw new Error('The input JSON is incomplete or invalid.');
  }
  return parsed as ProductionLegacyCredentialReissueInput;
}

function safeError(error: unknown) {
  const code =
    error instanceof TenantRecoveryError
      ? error.code
      : 'PRODUCTION_CREDENTIAL_REISSUE_FAILED';
  return { ok: false, error: { code, message: 'Production credential reissue was refused or failed safely.' } };
}

async function main() {
  let options: CommandOptions;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch {
    console.error(JSON.stringify(safeError(new Error())));
    process.exit(2);
    return;
  }
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (!options.inputPath) {
    console.error(JSON.stringify(safeError(new Error())));
    process.exit(2);
    return;
  }

  loadLocalEnvironment();
  let input: ProductionLegacyCredentialReissueInput;
  try {
    input = readApprovedInput(options.inputPath);
  } catch {
    console.error(JSON.stringify(safeError(new Error())));
    process.exit(2);
    return;
  }

  let guarded;
  try {
    guarded = assertDatabaseOperationAllowed({
      operation: options.execute ? 'production-credential-reissue' : 'read-only-diagnostic',
      requiredApplicationEnvironment: 'production',
      appEnvironment: process.env.APP_ENV,
      databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
      databaseUrl: process.env.DATABASE_URL,
      expectedFingerprint: process.env.DATABASE_FINGERPRINT,
      productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
      branchId: process.env.DATABASE_BRANCH_ID,
      productionCredentialReissueAcknowledgement:
        process.env.ACKNOWLEDGE_PRODUCTION_CREDENTIAL_REISSUE,
      productionCredentialReissueChangeId:
        process.env.PRODUCTION_CREDENTIAL_REISSUE_CHANGE_ID
    });
  } catch {
    console.error(JSON.stringify({ ok: false, error: { code: 'DATABASE_GUARD_DENIED', message: 'Production database guard denied the operation.' } }));
    process.exit(4);
    return;
  }

  const db = new PrismaClient();
  try {
    const plan = await planProductionLegacyCredentialReissue({ db, input });
    const safePlan = {
      safeToExecute: plan.safeToExecute,
      normalizedEmail: plan.normalizedEmail,
      planReference: plan.planReference,
      idempotency: plan.idempotency,
      operationId: plan.operationId,
      eligible: plan.eligible,
      account: plan.account,
      intendedDatabaseActions: plan.intendedDatabaseActions,
      ...(plan.refusalReason ? { refusalReason: plan.refusalReason } : {})
    };
    if (!options.execute) {
      console.log(JSON.stringify({ ok: plan.safeToExecute, mode: 'dry-run', plan: safePlan }, null, 2));
      process.exitCode = plan.safeToExecute ? 0 : 3;
      return;
    }
    if (
      !options.confirmProduction ||
      !options.planReference ||
      options.planReference !== plan.planReference
    ) {
      throw new TenantRecoveryError(
        'PRODUCTION_AUTHORIZATION_REQUIRED',
        'Execution requires the exact approved dry-run plan.'
      );
    }
    const temporaryCredential =
      plan.idempotency === 'COMPLETED_MATCH' ? '' : await readConfirmedHiddenCredential();
    const result = await executeProductionLegacyCredentialReissue({
      db,
      input,
      temporaryCredential,
      authorization: {
        confirmed: true,
        acknowledgement:
          process.env.ACKNOWLEDGE_PRODUCTION_CREDENTIAL_REISSUE ?? '',
        changeId: process.env.PRODUCTION_CREDENTIAL_REISSUE_CHANGE_ID ?? '',
        appEnvironment: guarded.appEnvironment as 'production',
        databaseEnvironment: guarded.databaseEnvironment as 'production',
        databaseFingerprint: guarded.identity.fingerprint,
        productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT ?? '',
        approvedPlanReference: options.planReference
      }
    });
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'execute',
          operation: {
            id: result.operation.id,
            status: result.operation.status,
            idempotentReplay: result.idempotentReplay
          },
          account: {
            normalizedEmail: input.email,
            organisationReference: plan.account.organisationReference,
            mustChangePassword: true,
            temporaryCredentialExpirySet: true,
            revokedSessionCount: result.revokedSessionCount
          }
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(JSON.stringify(safeError(error)));
    process.exitCode =
      error instanceof TenantRecoveryError &&
      ['INPUT_INVALID'].includes(error.code)
        ? 2
        : error instanceof TenantRecoveryError &&
            ['PRODUCTION_AUTHORIZATION_REQUIRED', 'PRODUCTION_DISABLED', 'APPROVER_NOT_AUTHORISED'].includes(error.code)
          ? 4
          : error instanceof TenantRecoveryError && error.code === 'TRANSACTION_FAILED'
            ? 5
            : 3;
  } finally {
    await db.$disconnect();
  }
}

void main();
