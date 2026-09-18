import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertExactSuccessfulRepositoryMigration,
  MIGRATION_RECORD_NORMALIZATION_VERSION,
  normaliseMigrationRecord,
  RepositoryMigrationExactSuccessError,
  type MigrationLedgerRow,
  type NormalisedMigrationRecord
} from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const migration = manifest.migrations.find(
  (item) => item.name === '20260710120000_identity_organisation_foundation'
)!;

function source(overrides: Partial<MigrationLedgerRow> = {}): MigrationLedgerRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    migration_name: migration.name,
    checksum: migration.checksum,
    started_at: '2026-07-16T18:11:33.556063Z',
    finished_at: '2026-07-16T18:11:33.733369Z',
    applied_steps_count: 1,
    rolled_back_at: null,
    logs: null,
    ...overrides
  };
}

function record(overrides: Partial<MigrationLedgerRow> = {}) {
  return normaliseMigrationRecord(source(overrides));
}

function failure(records: NormalisedMigrationRecord[]) {
  try {
    assertExactSuccessfulRepositoryMigration(records, migration);
  } catch (error) {
    assert.ok(error instanceof RepositoryMigrationExactSuccessError);
    assert.equal(error.report.migrationName, migration.name);
    assert.equal(error.report.normalizationVersion, MIGRATION_RECORD_NORMALIZATION_VERSION);
    return error;
  }
  assert.fail('Expected an exact-success failure.');
}

function reasons(error: RepositoryMigrationExactSuccessError) {
  return error.report.failures.map((item) => item.reason);
}

test('no record reports missing-record with an exact safe record count', () => {
  const error = failure([]);
  assert.equal(error.report.recordCount, 0);
  assert.deepEqual(error.report.recordIds, []);
  assert.deepEqual(reasons(error), ['missing-record']);
  assert.deepEqual(error.report.failures[0].expected, { kind: 'number', value: 1 });
  assert.deepEqual(error.report.failures[0].observed, { kind: 'number', value: 0 });
});

test('exactly one successful matching record passes unchanged', () => {
  assert.doesNotThrow(() => assertExactSuccessfulRepositoryMigration([record()], migration));
});

test('duplicate records report deterministic count and safe IDs', () => {
  const error = failure([
    record({ id: '22222222-2222-4222-8222-222222222222' }),
    record()
  ]);
  assert.deepEqual(reasons(error), ['duplicate-records']);
  assert.equal(error.report.recordCount, 2);
  assert.deepEqual(error.report.recordIds, [
    { kind: 'string', value: '11111111-1111-4111-8111-111111111111' },
    { kind: 'string', value: '22222222-2222-4222-8222-222222222222' }
  ]);
});

test('migration name mismatch reports only safe typed names', () => {
  const error = failure([
    record({ migration_name: '20260710130000_users_roles_permissions_audit' })
  ]);
  assert.deepEqual(reasons(error), ['migration-name-mismatch']);
  assert.equal(error.report.failures[0].field, 'migrationName');
});

test('checksum mismatch reports expected and observed SHA-256 values', () => {
  const error = failure([record({ checksum: 'f'.repeat(64) })]);
  assert.deepEqual(reasons(error), ['checksum-mismatch']);
  assert.deepEqual(error.report.failures[0].expected, {
    kind: 'string',
    value: migration.checksum
  });
});

test('unfinished record reports the field and lifecycle failures', () => {
  const error = failure([record({ finished_at: null })]);
  assert.deepEqual(reasons(error), ['unfinished', 'unexpected-lifecycle-state']);
  assert.deepEqual(error.report.failures[0].observed, { kind: 'null', value: null });
});

test('rolled-back record reports the field and failed lifecycle', () => {
  const error = failure([
    record({ rolled_back_at: '2026-07-16T18:12:00.000001Z' })
  ]);
  assert.deepEqual(reasons(error), ['rolled-back', 'unexpected-lifecycle-state']);
  assert.deepEqual(error.report.failures[0].observed, {
    kind: 'string',
    value: '2026-07-16T18:12:00.000001Z'
  });
});

test('applied-step mismatch preserves zero as a typed observed value', () => {
  const error = failure([record({ applied_steps_count: 0 })]);
  assert.deepEqual(reasons(error), ['applied-step-count-mismatch']);
  assert.deepEqual(error.report.failures[0].observed, { kind: 'number', value: 0 });
});

test('unexpected logs emit classification and digest without raw logs', () => {
  const raw = 'migration failed at postgresql://operator:credential@secret.example/neondb';
  const error = failure([record({ logs: raw })]);
  assert.deepEqual(reasons(error), ['unexpected-log-state', 'unexpected-log-digest']);
  assert.deepEqual(error.report.failures[1].observed, {
    kind: 'string',
    value: createHash('sha256').update(raw).digest('hex')
  });
  assert.doesNotMatch(error.message, /postgresql|operator|credential|secret\.example|neondb/i);
});

test('unexpected log digest remains independently classified', () => {
  const withDigest = record() as NormalisedMigrationRecord;
  withDigest.logsDigest = 'a'.repeat(64);
  const error = failure([withDigest]);
  assert.deepEqual(reasons(error), ['unexpected-log-digest']);
});

test('failed and unfinished lifecycle combinations report every reason in fixed order', () => {
  const error = failure([
    record({
      checksum: 'f'.repeat(64),
      finished_at: null,
      rolled_back_at: '2026-07-16T18:12:00.000001Z',
      applied_steps_count: 0,
      logs: 'synthetic raw log'
    })
  ]);
  assert.deepEqual(reasons(error), [
    'checksum-mismatch',
    'unfinished',
    'rolled-back',
    'applied-step-count-mismatch',
    'unexpected-log-state',
    'unexpected-log-digest',
    'unexpected-lifecycle-state'
  ]);
});

test('safe record IDs are emitted and credential-shaped IDs are redacted', () => {
  const safe = failure([record({ checksum: 'f'.repeat(64) })]);
  assert.deepEqual(safe.report.recordIds, [
    { kind: 'string', value: '11111111-1111-4111-8111-111111111111' }
  ]);
  const credential = 'postgresql://operator:password@private.example/neondb';
  const redacted = failure([record({ id: credential, checksum: 'f'.repeat(64) })]);
  assert.deepEqual(redacted.report.recordIds, [{ kind: 'redacted-invalid-format' }]);
  assert.doesNotMatch(redacted.message, /operator|password|private\.example|neondb|postgresql/i);
});

test('diagnostic serialization is identical across Windows and Linux inputs', () => {
  const first = failure([record({ checksum: 'f'.repeat(64) })]);
  const second = failure([record({ checksum: 'f'.repeat(64) })]);
  assert.equal(first.message, second.message);
  assert.doesNotMatch(first.message, /\r|\\|[A-Z]:\//);
});
