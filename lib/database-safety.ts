import { createHash } from 'node:crypto';

export const applicationEnvironments = ['production', 'preview', 'development', 'test'] as const;
export type ApplicationEnvironment = (typeof applicationEnvironments)[number];

export const databaseOperations = [
  'read-only-diagnostic',
  'migration-status',
  'migration-deploy',
  'migration-dev',
  'seed',
  'integration-test',
  'destructive-test',
  'reset',
  'smoke-write',
  'pilot-provision',
  'production-credential-reissue',
  'one-off-mutation',
  'jurisdiction-audit'
] as const;
export type DatabaseOperation = (typeof databaseOperations)[number];

export type DatabaseSafetyErrorCode =
  | 'DB_ENV_MISMATCH'
  | 'DB_PRODUCTION_TARGET_FORBIDDEN'
  | 'DB_FINGERPRINT_MISMATCH'
  | 'DB_IDENTITY_MISSING'
  | 'DB_URL_INVALID'
  | 'DB_OPERATION_NOT_ALLOWED';

export type SafeDatabaseIdentity = {
  host: string;
  port: string;
  databaseName: string;
  branchId?: string;
  fingerprint: string;
};

type GuardInput = {
  operation: DatabaseOperation;
  requiredApplicationEnvironment?: ApplicationEnvironment;
  appEnvironment?: string;
  databaseEnvironment?: string;
  databaseUrl?: string;
  expectedFingerprint?: string;
  productionFingerprint?: string;
  branchId?: string;
  productionMigrationPath?: boolean;
  productionMigrationAcknowledgement?: string;
  productionMigrationChangeId?: string;
  productionProvisioningAcknowledgement?: string;
  productionProvisioningChangeId?: string;
  productionCredentialReissueAcknowledgement?: string;
  productionCredentialReissueChangeId?: string;
  productionJurisdictionAuditAcknowledgement?: string;
  productionJurisdictionAuditChangeId?: string;
};

const PRODUCTION_MIGRATION_ACKNOWLEDGEMENT = 'APPLY_APPROVED_PRODUCTION_MIGRATIONS';
export const PRODUCTION_CREDENTIAL_REISSUE_ACKNOWLEDGEMENT =
  'REISSUE_APPROVED_PRODUCTION_CREDENTIAL';

export class DatabaseSafetyError extends Error {
  constructor(
    public readonly code: DatabaseSafetyErrorCode,
    message: string,
    public readonly details: {
      operation: DatabaseOperation;
      appEnvironment?: string;
      databaseEnvironment?: string;
      fingerprint?: string;
      databaseLabel?: string;
    }
  ) {
    super(message);
    this.name = 'DatabaseSafetyError';
  }
}

function isApplicationEnvironment(value: string): value is ApplicationEnvironment {
  return applicationEnvironments.includes(value as ApplicationEnvironment);
}

function requireEnvironment(value: string | undefined, label: string, operation: DatabaseOperation) {
  const normalised = value?.trim().toLowerCase();
  if (!normalised || !isApplicationEnvironment(normalised)) {
    throw new DatabaseSafetyError(
      'DB_IDENTITY_MISSING',
      `${label} must be one of: ${applicationEnvironments.join(', ')}.`,
      { operation }
    );
  }
  return normalised;
}

function normaliseBranchId(branchId: string | undefined, operation: DatabaseOperation) {
  const normalised = branchId?.trim().toLowerCase();
  if (!normalised) return undefined;
  if (!/^[a-z0-9_-]{1,128}$/.test(normalised)) {
    throw new DatabaseSafetyError('DB_URL_INVALID', 'Database branch identity is invalid.', { operation });
  }
  return normalised;
}

export function getDatabaseIdentity(
  databaseUrl: string | undefined,
  options: { branchId?: string; operation?: DatabaseOperation } = {}
): SafeDatabaseIdentity {
  const operation = options.operation ?? 'read-only-diagnostic';
  if (!databaseUrl?.trim()) {
    throw new DatabaseSafetyError('DB_IDENTITY_MISSING', 'Database URL is required.', { operation });
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new DatabaseSafetyError('DB_URL_INVALID', 'Database URL could not be parsed safely.', { operation });
  }

  if (!/^postgres(?:ql)?:$/.test(parsed.protocol) || !parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
    throw new DatabaseSafetyError(
      'DB_URL_INVALID',
      'Database URL must be a PostgreSQL URL with a host and database name.',
      { operation }
    );
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new DatabaseSafetyError('DB_URL_INVALID', 'Database name could not be parsed safely.', { operation });
  }

  if (!databaseName || databaseName.includes('/')) {
    throw new DatabaseSafetyError('DB_URL_INVALID', 'Database URL must identify exactly one database.', { operation });
  }

  const host = parsed.hostname.toLowerCase();
  const port = parsed.port || '5432';
  const branchId = normaliseBranchId(options.branchId, operation);
  // Branch ID is operator-supplied diagnostic metadata. It must not alter the
  // security identity or a false label could disguise an identical URL.
  const normalisedIdentity = JSON.stringify({ host, port, databaseName });
  const fingerprint = `db_${createHash('sha256').update(normalisedIdentity).digest('hex').slice(0, 16)}`;

  return { host, port, databaseName, branchId, fingerprint };
}

export function formatSafeDatabaseIdentity(identity: SafeDatabaseIdentity) {
  const branch = identity.branchId ? ` branch=${identity.branchId}` : '';
  return `host=${identity.host} database=${identity.databaseName}${branch} fingerprint=${identity.fingerprint}`;
}

export function assertDistinctDatabaseIdentities(
  primary: SafeDatabaseIdentity,
  candidate: SafeDatabaseIdentity,
  operation: DatabaseOperation = 'integration-test'
) {
  if (primary.fingerprint === candidate.fingerprint) {
    throw new DatabaseSafetyError(
      'DB_PRODUCTION_TARGET_FORBIDDEN',
      'TEST_DATABASE_URL and DATABASE_URL resolve to the same database identity.',
      {
        operation,
        fingerprint: candidate.fingerprint,
        databaseLabel: `${candidate.host}/${candidate.databaseName}`
      }
    );
  }
}

export function assertDisposableTestDatabase(
  candidate: SafeDatabaseIdentity,
  persistentFingerprints: {
    production?: string;
    preview?: string;
    development?: string;
  }
) {
  const entries = Object.entries(persistentFingerprints);
  if (entries.some(([, fingerprint]) => !fingerprint?.trim())) {
    throw new DatabaseSafetyError(
      'DB_IDENTITY_MISSING',
      'Production, Preview, and Development fingerprints are required to prove the test database is disposable.',
      {
        operation: 'integration-test',
        fingerprint: candidate.fingerprint,
        databaseLabel: `${candidate.host}/${candidate.databaseName}`
      }
    );
  }

  const matchingEnvironment = entries.find(([, fingerprint]) => fingerprint?.trim() === candidate.fingerprint)?.[0];
  if (matchingEnvironment) {
    throw new DatabaseSafetyError(
      matchingEnvironment === 'production' ? 'DB_PRODUCTION_TARGET_FORBIDDEN' : 'DB_OPERATION_NOT_ALLOWED',
      `Disposable test database matches the known ${matchingEnvironment} database fingerprint.`,
      {
        operation: 'integration-test',
        databaseEnvironment: 'test',
        fingerprint: candidate.fingerprint,
        databaseLabel: `${candidate.host}/${candidate.databaseName}`
      }
    );
  }
}

function block(
  code: DatabaseSafetyErrorCode,
  message: string,
  input: GuardInput,
  identity?: SafeDatabaseIdentity,
  appEnvironment?: string,
  databaseEnvironment?: string
): never {
  throw new DatabaseSafetyError(code, message, {
    operation: input.operation,
    appEnvironment,
    databaseEnvironment,
    fingerprint: identity?.fingerprint,
    databaseLabel: identity ? `${identity.host}/${identity.databaseName}` : undefined
  });
}

export function assertDatabaseOperationAllowed(input: GuardInput) {
  const appEnvironment = requireEnvironment(input.appEnvironment, 'APP_ENV', input.operation);
  const databaseEnvironment = requireEnvironment(
    input.databaseEnvironment,
    'DATABASE_ENVIRONMENT',
    input.operation
  );
  const identity = getDatabaseIdentity(input.databaseUrl, {
    branchId: input.branchId,
    operation: input.operation
  });
  const expectedFingerprint = input.expectedFingerprint?.trim();
  const productionFingerprint = input.productionFingerprint?.trim();

  if (!expectedFingerprint || !productionFingerprint) {
    block(
      'DB_IDENTITY_MISSING',
      'Expected and Production database fingerprints are required for guarded operations.',
      input,
      identity,
      appEnvironment,
      databaseEnvironment
    );
  }
  if (expectedFingerprint !== identity.fingerprint) {
    block(
      'DB_FINGERPRINT_MISMATCH',
      'Computed database fingerprint does not match the configured expected fingerprint.',
      input,
      identity,
      appEnvironment,
      databaseEnvironment
    );
  }

  const targetsProduction = identity.fingerprint === productionFingerprint;
  if (databaseEnvironment === 'production' && !targetsProduction) {
    block(
      'DB_FINGERPRINT_MISMATCH',
      'A database marked Production must match the positive Production fingerprint.',
      input,
      identity,
      appEnvironment,
      databaseEnvironment
    );
  }
  if (databaseEnvironment !== 'production' && targetsProduction) {
    block(
      'DB_PRODUCTION_TARGET_FORBIDDEN',
      'A non-Production database classification resolves to the Production fingerprint.',
      input,
      identity,
      appEnvironment,
      databaseEnvironment
    );
  }
  if (appEnvironment !== databaseEnvironment) {
    block(
      'DB_ENV_MISMATCH',
      'Application and database environment classifications do not match.',
      input,
      identity,
      appEnvironment,
      databaseEnvironment
    );
  }
  if (
    input.requiredApplicationEnvironment &&
    appEnvironment !== input.requiredApplicationEnvironment
  ) {
    block(
      'DB_OPERATION_NOT_ALLOWED',
      `This command is restricted to the ${input.requiredApplicationEnvironment} application environment.`,
      input,
      identity,
      appEnvironment,
      databaseEnvironment
    );
  }

  const alwaysForbiddenOnProduction: DatabaseOperation[] = [
    'seed',
    'integration-test',
    'destructive-test',
    'reset',
    'smoke-write',
    'one-off-mutation',
    'migration-dev'
  ];
  if (targetsProduction && alwaysForbiddenOnProduction.includes(input.operation)) {
    block(
      'DB_PRODUCTION_TARGET_FORBIDDEN',
      `Operation ${input.operation} is never allowed against Production.`,
      input,
      identity,
      appEnvironment,
      databaseEnvironment
    );
  }

  if (input.operation === 'migration-deploy' && targetsProduction) {
    if (
      !input.productionMigrationPath ||
      input.productionMigrationAcknowledgement !== PRODUCTION_MIGRATION_ACKNOWLEDGEMENT ||
      !input.productionMigrationChangeId?.trim()
    ) {
      block(
        'DB_OPERATION_NOT_ALLOWED',
        'Production migration requires the dedicated command, exact acknowledgement, and a change identifier.',
        input,
        identity,
        appEnvironment,
        databaseEnvironment
      );
    }
  }

  if (input.operation === 'pilot-provision' && targetsProduction) {
    if (
      input.productionProvisioningAcknowledgement !== 'PROVISION_VERIFIED_PILOT' ||
      !input.productionProvisioningChangeId?.trim()
    ) {
      block(
        'DB_OPERATION_NOT_ALLOWED',
        'Production pilot provisioning requires the exact acknowledgement and a change identifier.',
        input,
        identity,
        appEnvironment,
        databaseEnvironment
      );
    }
  }

  if (input.operation === 'production-credential-reissue') {
    if (!targetsProduction || appEnvironment !== 'production' || databaseEnvironment !== 'production') {
      block(
        'DB_OPERATION_NOT_ALLOWED',
        'Production credential reissue is restricted to the positively identified Production database.',
        input,
        identity,
        appEnvironment,
        databaseEnvironment
      );
    }
    if (
      input.productionCredentialReissueAcknowledgement !==
        PRODUCTION_CREDENTIAL_REISSUE_ACKNOWLEDGEMENT ||
      !input.productionCredentialReissueChangeId?.trim()
    ) {
      block(
        'DB_OPERATION_NOT_ALLOWED',
        'Production credential reissue requires the exact acknowledgement and an approved change identifier.',
        input,
        identity,
        appEnvironment,
        databaseEnvironment
      );
    }
  }

  if (input.operation === 'jurisdiction-audit' && targetsProduction) {
    if (
      input.productionJurisdictionAuditAcknowledgement !== 'AUDIT_SOLARGRANT_JURISDICTION' ||
      !input.productionJurisdictionAuditChangeId?.trim()
    ) {
      block(
        'DB_OPERATION_NOT_ALLOWED',
        'Production jurisdiction audit requires the exact acknowledgement and a change identifier.',
        input,
        identity,
        appEnvironment,
        databaseEnvironment
      );
    }
  }

  if (input.operation === 'migration-dev' && appEnvironment !== 'development') {
    block('DB_OPERATION_NOT_ALLOWED', 'Prisma migrate dev is restricted to Development.', input, identity, appEnvironment, databaseEnvironment);
  }
  if (input.operation === 'reset' && !['development', 'test'].includes(appEnvironment)) {
    block('DB_OPERATION_NOT_ALLOWED', 'Database reset is restricted to Development or test databases.', input, identity, appEnvironment, databaseEnvironment);
  }
  if (input.operation === 'seed' && !['development', 'test'].includes(appEnvironment)) {
    block('DB_OPERATION_NOT_ALLOWED', 'Seed is restricted to Development or test databases.', input, identity, appEnvironment, databaseEnvironment);
  }
  if (['integration-test', 'destructive-test'].includes(input.operation) && appEnvironment !== 'test') {
    block('DB_OPERATION_NOT_ALLOWED', 'Database tests require a test environment and test database.', input, identity, appEnvironment, databaseEnvironment);
  }
  if (input.operation === 'smoke-write' && !['preview', 'test'].includes(appEnvironment)) {
    block('DB_OPERATION_NOT_ALLOWED', 'Smoke writes are restricted to isolated Preview or test databases.', input, identity, appEnvironment, databaseEnvironment);
  }
  if (input.operation === 'jurisdiction-audit' && !['development', 'preview', 'production'].includes(appEnvironment)) {
    block('DB_OPERATION_NOT_ALLOWED', 'Jurisdiction audit is restricted to Development, Preview, or Production.', input, identity, appEnvironment, databaseEnvironment);
  }

  return { appEnvironment, databaseEnvironment, identity, targetsProduction };
}

export function assertRuntimeDatabaseSafety(environment: NodeJS.ProcessEnv) {
  // Pure unit tests import server modules but do not connect. Database-backed
  // tests remain protected by the integration runner before NODE_ENV is set.
  if (environment.NODE_ENV === 'test') return undefined;
  if (!environment.DATABASE_URL?.trim()) return undefined;
  return assertDatabaseOperationAllowed({
    operation: 'read-only-diagnostic',
    appEnvironment: environment.APP_ENV,
    databaseEnvironment: environment.DATABASE_ENVIRONMENT,
    databaseUrl: environment.DATABASE_URL,
    expectedFingerprint: environment.DATABASE_FINGERPRINT,
    productionFingerprint: environment.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: environment.DATABASE_BRANCH_ID
  });
}

export function formatDatabaseSafetyError(error: unknown) {
  if (!(error instanceof DatabaseSafetyError)) return 'DB_OPERATION_NOT_ALLOWED: Database operation failed safely.';
  const { details } = error;
  const context = [
    `operation=${details.operation}`,
    `app=${details.appEnvironment ?? 'unknown'}`,
    `database=${details.databaseEnvironment ?? 'unknown'}`,
    `target=${details.databaseLabel ?? 'unknown'}`,
    `fingerprint=${details.fingerprint ?? 'unknown'}`
  ].join(' ');
  return `${error.code}: ${error.message} ${context}`;
}
