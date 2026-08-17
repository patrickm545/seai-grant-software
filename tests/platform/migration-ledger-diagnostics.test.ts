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
const failedLog = 'synthetic failed migration log';
const failedExpected: AttestedMigrationRecord = {
  ...structuredClone(attestation.relatedMigration.failedRecord),
  id: '33333333-3333-4333-8333-333333333333',
  logsDigest: createHash('sha256').update(failedLog).digest('hex')
};
const completedExpected: AttestedMigrationRecord = {
  ...structuredClone(attestation.relatedMigration.completedZeroStepRecord),
  id: '44444444-4444-4444-8444-444444444444'
};

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

function failedRow(overrides: Partial<MigrationLedgerRow> = {}): MigrationLedgerRow {
  return {
    id: failedExpected.id!,
    migration_name: failedExpected.migrationName,
    checksum: failedExpected.checksum,
    started_at: failedExpected.startedAt,
    finished_at: failedExpected.finishedAt,
    applied_steps_count: failedExpected.appliedStepsCount,
    rolled_back_at: failedExpected.rolledBackAt,
    logs: failedLog,
    ...overrides
  };
}

function failedMismatch(actualRow: MigrationLedgerRow) {
  try {
    assertExactAttestedMigrationRecord(
      normaliseMigrationRecord(actualRow),
      failedExpected,
      'Related failed record'
    );
  } catch (error) {
    assert.ok(error instanceof MigrationRecordMismatchError);
    assert.equal(error.report.migrationIdentity, failedExpected.migrationName);
    assert.equal(error.report.normalizationVersion, MIGRATION_RECORD_NORMALIZATION_VERSION);
    return error;
  }
  assert.fail('Expected a failed-record migration mismatch.');
}

function completedRow(overrides: Partial<MigrationLedgerRow> = {}): MigrationLedgerRow {
  return {
    id: completedExpected.id!,
    migration_name: completedExpected.migrationName,
    checksum: completedExpected.checksum,
    started_at: completedExpected.startedAt,
    finished_at: completedExpected.finishedAt,
    applied_steps_count: completedExpected.appliedStepsCount,
    rolled_back_at: completedExpected.rolledBackAt,
    logs: null,
    ...overrides
  };
}

function completedMismatch(actualRow: MigrationLedgerRow) {
  try {
    assertExactAttestedMigrationRecord(
      normaliseMigrationRecord(actualRow),
      completedExpected,
      'Related zero-step record'
    );
  } catch (error) {
    assert.ok(error instanceof MigrationRecordMismatchError);
    assert.equal(error.report.migrationIdentity, completedExpected.migrationName);
    assert.equal(error.report.normalizationVersion, MIGRATION_RECORD_NORMALIZATION_VERSION);
    return error;
  }
  assert.fail('Expected a completed zero-step record mismatch.');
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
          started_at: '2026-04-23T07:04:10.395540Z',
          finished_at: '2026-04-23T07:04:10.527739Z'
        })
      ),
      expected,
      'Database-only migration'
    )
  );
  const error = mismatch(row({ started_at: '2026-04-23T07:04:10.395541Z' }));
  assert.deepEqual(field(error, 'startedAt').observed, {
    kind: 'string',
    value: '2026-04-23T07:04:10.395541Z'
  });
});

test('the superseded millisecond-only expected timestamps fail exact comparison', () => {
  const started = mismatch(row({ started_at: '2026-04-23T07:04:10.395Z' }));
  assert.deepEqual(started.report.mismatches.map((item) => item.field), ['startedAt']);
  const finished = mismatch(row({ finished_at: '2026-04-23T07:04:10.527Z' }));
  assert.deepEqual(finished.report.mismatches.map((item) => item.field), ['finishedAt']);
});

test('R7 failed-record microseconds are exact and millisecond truncation fails closed', () => {
  assert.doesNotThrow(() =>
    assertExactAttestedMigrationRecord(
      normaliseMigrationRecord(failedRow()),
      failedExpected,
      'Related failed record'
    )
  );

  const started = failedMismatch(
    failedRow({ started_at: '2026-04-29T06:01:05.497Z' })
  );
  assert.deepEqual(started.report.mismatches.map((item) => item.field), ['startedAt']);
  assert.deepEqual(field(started, 'startedAt').expected, {
    kind: 'string',
    value: '2026-04-29T06:01:05.497406Z'
  });

  const rolledBack = failedMismatch(
    failedRow({ rolled_back_at: '2026-04-29T06:01:38.423Z' })
  );
  assert.deepEqual(rolledBack.report.mismatches.map((item) => item.field), [
    'rolledBackAt'
  ]);
  assert.deepEqual(field(rolledBack, 'rolledBackAt').expected, {
    kind: 'string',
    value: '2026-04-29T06:01:38.423504Z'
  });
});

test('R8 completed zero-step microseconds are exact and millisecond truncation fails closed', () => {
  assert.doesNotThrow(() =>
    assertExactAttestedMigrationRecord(
      normaliseMigrationRecord(completedRow()),
      completedExpected,
      'Related zero-step record'
    )
  );

  const started = completedMismatch(
    completedRow({ started_at: '2026-04-29T06:01:38.543Z' })
  );
  assert.deepEqual(started.report.mismatches.map((item) => item.field), ['startedAt']);
  assert.deepEqual(field(started, 'startedAt').expected, {
    kind: 'string',
    value: '2026-04-29T06:01:38.54346Z'
  });

  const finished = completedMismatch(
    completedRow({ finished_at: '2026-04-29T06:01:38.543Z' })
  );
  assert.deepEqual(finished.report.mismatches.map((item) => item.field), ['finishedAt']);
  assert.deepEqual(field(finished, 'finishedAt').expected, {
    kind: 'string',
    value: '2026-04-29T06:01:38.54346Z'
  });

  assert.equal(completedExpected.appliedStepsCount, 0);
  assert.equal(completedExpected.rolledBackAt, null);
  assert.equal(completedExpected.logsState, 'none');
  assert.deepEqual(attestation.relatedMigration.failedRecord, {
    id: '187cd0e2-f2ca-46fc-937d-1922e319e800',
    migrationName: '20260428120000_manual_submission_prep',
    checksum: '42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3',
    startedAt: '2026-04-29T06:01:05.497406Z',
    finishedAt: null,
    appliedStepsCount: 0,
    rolledBackAt: '2026-04-29T06:01:38.423504Z',
    logsState: 'sha256',
    logsDigest: '7c78bca364df96d2eb43e336b1c4d2fdc7356ba5a2c473306492150ca58e16b0'
  });
  assert.equal(attestation.missingMigration.startedAt, '2026-04-23T07:04:10.39554Z');
  assert.equal(attestation.missingMigration.finishedAt, '2026-04-23T07:04:10.527739Z');
  assert.equal(attestation.status, 'active');
  assert.equal(attestation.pilotStageCompensatingControl?.captures.length, 2);
  assert.equal(attestation.approvals.length, 1);
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
