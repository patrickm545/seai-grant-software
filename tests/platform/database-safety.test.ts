import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDatabaseOperationAllowed,
  assertDisposableTestDatabase,
  assertDistinctDatabaseIdentities,
  DatabaseSafetyError,
  formatDatabaseSafetyError,
  getDatabaseIdentity,
  type DatabaseOperation
} from '../../lib/database-safety';

const urls = {
  production: 'postgresql://prod_user:prod_password@ep-production.neon.tech/clada?sslmode=require',
  preview: 'postgresql://preview_user:preview_password@ep-preview.neon.tech/clada?sslmode=require',
  development: 'postgresql://dev_user:dev_password@localhost:5432/clada_development',
  test: 'postgresql://test_user:test_password@localhost:5432/clada_disposable_test'
};

const fingerprints = Object.fromEntries(
  Object.entries(urls).map(([name, url]) => [name, getDatabaseIdentity(url).fingerprint])
) as Record<keyof typeof urls, string>;

function guard(args: {
  operation: DatabaseOperation;
  app: keyof typeof urls;
  database?: keyof typeof urls;
  expectedFingerprint?: string;
  productionPath?: boolean;
  requiredEnvironment?: keyof typeof urls;
}) {
  const database = args.database ?? args.app;
  return assertDatabaseOperationAllowed({
    operation: args.operation,
    requiredApplicationEnvironment: args.requiredEnvironment,
    appEnvironment: args.app,
    databaseEnvironment: database,
    databaseUrl: urls[database],
    expectedFingerprint: args.expectedFingerprint ?? fingerprints[database],
    productionFingerprint: fingerprints.production,
    productionMigrationPath: args.productionPath,
    productionMigrationAcknowledgement: args.productionPath
      ? 'APPLY_APPROVED_PRODUCTION_MIGRATIONS'
      : undefined,
    productionMigrationChangeId: args.productionPath ? 'PR-20' : undefined
  });
}

function expectCode(code: DatabaseSafetyError['code'], callback: () => unknown) {
  assert.throws(callback, (error: unknown) => error instanceof DatabaseSafetyError && error.code === code);
}

test('Production app and Production database allow read-only migration status', () => {
  assert.equal(guard({ operation: 'migration-status', app: 'production' }).targetsProduction, true);
});

test('Production migration requires the explicit production path', () => {
  expectCode('DB_OPERATION_NOT_ALLOWED', () => guard({ operation: 'migration-deploy', app: 'production' }));
  assert.equal(
    guard({ operation: 'migration-deploy', app: 'production', productionPath: true }).targetsProduction,
    true
  );
});

test('Preview app cannot target Production', () => {
  expectCode('DB_ENV_MISMATCH', () => guard({ operation: 'migration-status', app: 'preview', database: 'production' }));
});

test('Development app cannot target Production', () => {
  expectCode('DB_ENV_MISMATCH', () => guard({ operation: 'migration-status', app: 'development', database: 'production' }));
});

for (const operation of ['integration-test', 'reset', 'seed'] as const) {
  test(`${operation} cannot target Production`, () => {
    expectCode('DB_ENV_MISMATCH', () => guard({ operation, app: 'test', database: 'production' }));
  });
}

test('fingerprint mismatch is rejected', () => {
  expectCode('DB_FINGERPRINT_MISMATCH', () =>
    guard({ operation: 'migration-status', app: 'preview', expectedFingerprint: fingerprints.development })
  );
});

test('missing identity metadata is rejected for sensitive commands', () => {
  expectCode('DB_IDENTITY_MISSING', () =>
    assertDatabaseOperationAllowed({
      operation: 'seed',
      appEnvironment: 'test',
      databaseEnvironment: 'test',
      databaseUrl: urls.test
    })
  );
});

test('malformed database URLs fail safely', () => {
  expectCode('DB_URL_INVALID', () =>
    assertDatabaseOperationAllowed({
      operation: 'migration-status',
      appEnvironment: 'preview',
      databaseEnvironment: 'preview',
      databaseUrl: 'not a database URL',
      expectedFingerprint: 'db_unknown',
      productionFingerprint: fingerprints.production
    })
  );
});

test('formatted diagnostics never expose credentials or complete URLs', () => {
  let diagnostic = '';
  try {
    guard({ operation: 'migration-status', app: 'preview', expectedFingerprint: fingerprints.development });
  } catch (error) {
    diagnostic = formatDatabaseSafetyError(error);
  }
  assert.doesNotMatch(diagnostic, /preview_user|preview_password|sslmode|postgresql:\/\//);
  assert.match(diagnostic, /fingerprint=db_/);
});

test('disposable test database is accepted', () => {
  const accepted = guard({ operation: 'integration-test', app: 'test' });
  assertDisposableTestDatabase(accepted.identity, {
    production: fingerprints.production,
    preview: fingerprints.preview,
    development: fingerprints.development
  });
  assert.equal(accepted.databaseEnvironment, 'test');
});

test('test runner rejects a known persistent Preview or Development database', () => {
  const preview = getDatabaseIdentity(urls.preview);
  expectCode('DB_OPERATION_NOT_ALLOWED', () =>
    assertDisposableTestDatabase(preview, {
      production: fingerprints.production,
      preview: fingerprints.preview,
      development: fingerprints.development
    })
  );
});

test('test runner fails closed when persistent identity markers are missing', () => {
  expectCode('DB_IDENTITY_MISSING', () =>
    assertDisposableTestDatabase(getDatabaseIdentity(urls.test), {
      production: fingerprints.production,
      preview: undefined,
      development: fingerprints.development
    })
  );
});

test('Preview database is accepted for Preview migrations and smoke testing', () => {
  assert.equal(guard({ operation: 'migration-deploy', app: 'preview' }).databaseEnvironment, 'preview');
  assert.equal(guard({ operation: 'smoke-write', app: 'preview' }).databaseEnvironment, 'preview');
});

test('named environment commands cannot run against a different matching non-Production environment', () => {
  expectCode('DB_OPERATION_NOT_ALLOWED', () =>
    guard({ operation: 'migration-deploy', app: 'test', requiredEnvironment: 'preview' })
  );
  expectCode('DB_OPERATION_NOT_ALLOWED', () =>
    guard({ operation: 'seed', app: 'development', requiredEnvironment: 'test' })
  );
});

test('identical DATABASE_URL and TEST_DATABASE_URL identities are rejected even with different credentials', () => {
  const primary = getDatabaseIdentity('postgresql://primary:secret@localhost:5432/clada_disposable_test', {
    branchId: 'claimed-primary'
  });
  const candidate = getDatabaseIdentity('postgresql://test:different@localhost:5432/clada_disposable_test', {
    branchId: 'claimed-test'
  });
  expectCode('DB_PRODUCTION_TARGET_FORBIDDEN', () => assertDistinctDatabaseIdentities(primary, candidate));
});

test('a Production fingerprint cannot be hidden behind a non-Production label', () => {
  expectCode('DB_PRODUCTION_TARGET_FORBIDDEN', () =>
    assertDatabaseOperationAllowed({
      operation: 'migration-deploy',
      appEnvironment: 'preview',
      databaseEnvironment: 'preview',
      databaseUrl: urls.production,
      expectedFingerprint: fingerprints.production,
      productionFingerprint: fingerprints.production
    })
  );
});
