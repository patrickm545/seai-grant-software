import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { AttestedMigrationRecord, LineageAttestation } from '../../lib/lineage-attestation';
import {
  assertExactAttestedMigrationRecord,
  MIGRATION_RECORD_NORMALIZATION_VERSION,
  MigrationRecordMismatchError,
  normaliseMigrationRecord,
  type MigrationLedgerRow,
  type MigrationRecordMismatch
} from '../../lib/migration-ledger';

const attestation = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;
const expected = attestation.missingMigration;

function row(overrides: Partial<MigrationLedgerRow> = {}): MigrationLedgerRow {
  return {
    id: expected.id!,
    migration_name: expected.migrationName,
    checksum: expected.checksum,
    started_at: expected.startedAt,
    finished_at: expected.finishedAt,
    applied_steps_count: expected.appliedStepsCount,
    rolled_back_at: expected.rolledBackAt,
    logs: null,
    ...overrides
  };
}

function mismatch(
  actualRow: MigrationLedgerRow,
  expectedRecord: AttestedMigrationRecord = structuredClone(expected)
) {
  try {
    assertExactAttestedMigrationRecord(
      normaliseMigrationRecord(actualRow),
      expectedRecord,
      'Database-only migration'
    );
  } catch (error) {
    assert.ok(error instanceof MigrationRecordMismatchError);
    assert.equal(error.report.migrationIdentity, expected.migrationName);
    assert.equal(error.report.normalizationVersion, MIGRATION_RECORD_NORMALIZATION_VERSION);
    return error;
  }
  assert.fail('Expected a migration-record mismatch.');
}

function field(error: MigrationRecordMismatchError, name: MigrationRecordMismatch['field']) {
  const result = error.report.mismatches.find((item) => item.field === name);
  assert.ok(result, `Expected mismatch field ${name}.`);
  return result;
}

test('database-only record ID mismatch reports only the safe UUID values', () => {
  const error = mismatch(row({ id: '11111111-1111-4111-8111-111111111111' }));
  assert.deepEqual(error.report.mismatches.map((item) => item.field), ['id']);
  assert.deepEqual(field(error, 'id').observed, {
    kind: 'string',
    value: '11111111-1111-4111-8111-111111111111'
  });
});

test('checksum mismatch reports exact safe digests', () => {
  const error = mismatch(row({ checksum: 'f'.repeat(64) }));
  assert.deepEqual(error.report.mismatches.map((item) => item.field), ['checksum']);
  assert.deepEqual(field(error, 'checksum').expected, {
    kind: 'string',
    value: expected.checksum
  });
});

test('started and finished timestamp mismatches report canonical UTC values', () => {
  const started = mismatch(row({ started_at: '2026-04-23T07:04:10.396000Z' }));
  assert.deepEqual(field(started, 'startedAt').observed, {
    kind: 'string',
    value: '2026-04-23T07:04:10.396Z'
  });

  const finished = mismatch(row({ finished_at: '2026-04-23T07:04:10.528000Z' }));
  assert.deepEqual(field(finished, 'finishedAt').observed, {
    kind: 'string',
    value: '2026-04-23T07:04:10.528Z'
  });
});

test('timestamp precision is significant but trailing zero precision is equivalent', () => {
  assert.doesNotThrow(() =>
    assertExactAttestedMigrationRecord(
      normaliseMigrationRecord(
        row({
          started_at: '2026-04-23T07:04:10.395000Z',
          finished_at: '2026-04-23T07:04:10.527000Z'
        })
      ),
      expected,
      'Database-only migration'
    )
  );
  const error = mismatch(row({ started_at: '2026-04-23T07:04:10.395001Z' }));
  assert.deepEqual(field(error, 'startedAt').observed, {
    kind: 'string',
    value: '2026-04-23T07:04:10.395001Z'
  });
});

test('null and absent rollback state are reported distinctly', () => {
  const withoutRollback = structuredClone(expected) as Partial<AttestedMigrationRecord>;
  delete withoutRollback.rolledBackAt;
  const error = mismatch(row(), withoutRollback as AttestedMigrationRecord);
  assert.deepEqual(field(error, 'rolledBackAt').expected, { kind: 'absent' });
  assert.deepEqual(field(error, 'rolledBackAt').observed, { kind: 'null', value: null });
});

test('applied-step count mismatch distinguishes one, zero, and absence', () => {
  const zero = mismatch(row({ applied_steps_count: 0 }));
  assert.deepEqual(field(zero, 'appliedStepsCount').observed, { kind: 'number', value: 0 });

  const withoutCount = structuredClone(expected) as Partial<AttestedMigrationRecord>;
  delete withoutCount.appliedStepsCount;
  const absent = mismatch(row(), withoutCount as AttestedMigrationRecord);
  assert.deepEqual(field(absent, 'appliedStepsCount').expected, { kind: 'absent' });
});

test('log-state mismatch emits classification and digest but never raw logs', () => {
  const rawLog = 'database failure for postgresql://role:credential@secret.example/neondb';
  const error = mismatch(row({ logs: rawLog }));
  assert.deepEqual(field(error, 'logsState').observed, { kind: 'string', value: 'sha256' });
  assert.deepEqual(field(error, 'logsDigest').observed, {
    kind: 'string',
    value: createHash('sha256').update(rawLog).digest('hex')
  });
  assert.doesNotMatch(error.message, /postgresql|credential|secret\.example|neondb/i);
});

test('log-digest mismatch reports only the two approved SHA-256 values', () => {
  const expectedLog = 'synthetic expected log';
  const observedLog = 'synthetic observed log';
  const expectedRecord = {
    ...structuredClone(expected),
    logsState: 'sha256' as const,
    logsDigest: createHash('sha256').update(expectedLog).digest('hex')
  };
  const error = mismatch(row({ logs: observedLog }), expectedRecord);
  assert.deepEqual(error.report.mismatches.map((item) => item.field), ['logsDigest']);
  assert.doesNotMatch(error.message, /synthetic expected log|synthetic observed log/);
});

test('multiple mismatching fields are emitted in deterministic approved-field order', () => {
  const error = mismatch(
    row({
      id: '11111111-1111-4111-8111-111111111111',
      checksum: 'f'.repeat(64),
      applied_steps_count: 0
    })
  );
  assert.deepEqual(error.report.mismatches.map((item) => item.field), [
    'id',
    'checksum',
    'appliedStepsCount'
  ]);
});

test('invalid credential-bearing field values are redacted from mismatch output', () => {
  const credential = 'postgresql://operator:password@private.example/neondb';
  const error = mismatch(row({ id: credential, logs: credential }));
  assert.deepEqual(field(error, 'id').observed, { kind: 'redacted-invalid-format' });
  assert.doesNotMatch(error.message, /operator|password|private\.example|neondb|postgresql/i);
});

test('an exact matching record passes unchanged', () => {
  assert.doesNotThrow(() =>
    assertExactAttestedMigrationRecord(
      normaliseMigrationRecord(row()),
      expected,
      'Database-only migration'
    )
  );
});

test('mismatch normalization and serialization are platform-independent', () => {
  const first = mismatch(row({ started_at: '2026-04-23T07:04:10.395456Z' }));
  const second = mismatch(row({ started_at: '2026-04-23T07:04:10.395456Z' }));
  assert.equal(first.message, second.message);
  assert.doesNotMatch(first.message, /\r|\\|[A-Z]:\//);
});
