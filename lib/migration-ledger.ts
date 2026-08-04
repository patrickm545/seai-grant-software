import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json';
import type { LineageAttestation, AttestedMigrationRecord } from './lineage-attestation';
import type { MigrationManifest } from './migration-manifest';
import { canonicaliseMigrationTimestamp } from './migration-timestamp';

export type MigrationLedgerRow = {
  id: string;
  migration_name: string;
  checksum: string;
  started_at: Date | string;
  finished_at: Date | string | null;
  applied_steps_count: number | bigint;
  rolled_back_at: Date | string | null;
  logs: string | null;
};

export type NormalisedMigrationRecord = {
  id: string;
  migrationName: string;
  checksum: string;
  startedAt: string;
  finishedAt: string | null;
  appliedStepsCount: number;
  rolledBackAt: string | null;
  logsState: 'none' | 'sha256';
  logsDigest: string | null;
};

export const MIGRATION_RECORD_NORMALIZATION_VERSION =
  'adr-0024-migration-record-normalization/v1' as const;
export const MIGRATION_RECORD_MISMATCH_REPORT_VERSION =
  'adr-0024-migration-record-mismatch/v1' as const;

const comparedRecordFields = [
  'id',
  'migrationName',
  'checksum',
  'startedAt',
  'finishedAt',
  'appliedStepsCount',
  'rolledBackAt',
  'logsState',
  'logsDigest'
] as const satisfies ReadonlyArray<keyof NormalisedMigrationRecord>;

type ComparedRecordField = (typeof comparedRecordFields)[number];
type MismatchField = ComparedRecordField | 'recordShape';
type SafeComparedValue =
  | { kind: 'absent' }
  | { kind: 'null'; value: null }
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'redacted-invalid-format' };

export type MigrationRecordMismatch = {
  field: MismatchField;
  expected: SafeComparedValue;
  observed: SafeComparedValue;
  comparisonRule: string;
};

export type MigrationRecordMismatchReport = {
  reportVersion: typeof MIGRATION_RECORD_MISMATCH_REPORT_VERSION;
  migrationIdentity: string;
  normalizationVersion: typeof MIGRATION_RECORD_NORMALIZATION_VERSION;
  mismatches: MigrationRecordMismatch[];
};

export class MigrationRecordMismatchError extends Error {
  constructor(
    label: string,
    public readonly report: MigrationRecordMismatchReport
  ) {
    super(
      `${label} metadata differs from the attestation; mismatchReport=${canonicalJson(report)}`
    );
    this.name = 'MigrationRecordMismatchError';
  }
}

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const sha256Pattern = /^[a-f0-9]{64}$/;
const migrationNamePattern = /^\d{14}_[a-z0-9_]+$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,6}Z$/;

function comparisonRule(field: MismatchField) {
  if (field === 'startedAt' || field === 'finishedAt' || field === 'rolledBackAt') {
    return 'exact canonical UTC ISO-8601 value with significant fractional precision; null and absent are distinct';
  }
  if (field === 'appliedStepsCount') {
    return 'exact non-negative safe integer; zero and absent are distinct';
  }
  if (field === 'logsState') {
    return 'exact log-state classification: none or sha256';
  }
  if (field === 'logsDigest') {
    return 'exact lowercase SHA-256 digest or null; raw logs are excluded';
  }
  if (field === 'recordShape') {
    return 'exact canonical object shape; unapproved field names and values are excluded';
  }
  return 'exact safe string and property presence';
}

function safeComparedValue(
  record: Partial<Record<ComparedRecordField, unknown>>,
  field: ComparedRecordField
): SafeComparedValue {
  if (!Object.prototype.hasOwnProperty.call(record, field)) return { kind: 'absent' };
  const value = record[field];
  if (value === null) return { kind: 'null', value: null };
  if (typeof value === 'number') return { kind: 'number', value };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value !== 'string') return { kind: 'redacted-invalid-format' };
  if (value === '') return { kind: 'string', value };

  const safe =
    (field === 'id' && uuidPattern.test(value)) ||
    (field === 'migrationName' && migrationNamePattern.test(value)) ||
    ((field === 'checksum' || field === 'logsDigest') && sha256Pattern.test(value)) ||
    ((field === 'startedAt' || field === 'finishedAt' || field === 'rolledBackAt') &&
      timestampPattern.test(value)) ||
    (field === 'logsState' && (value === 'none' || value === 'sha256'));
  return safe ? { kind: 'string', value } : { kind: 'redacted-invalid-format' };
}

function safeMigrationIdentity(
  actual: NormalisedMigrationRecord,
  expected: AttestedMigrationRecord
) {
  const expectedValue = safeComparedValue(expected, 'migrationName');
  if (expectedValue.kind === 'string' && expectedValue.value) return expectedValue.value;
  const actualValue = safeComparedValue(actual, 'migrationName');
  return actualValue.kind === 'string' && actualValue.value
    ? actualValue.value
    : '[redacted-invalid-format]';
}

function mismatchReport(
  actual: NormalisedMigrationRecord,
  expected: AttestedMigrationRecord
): MigrationRecordMismatchReport {
  const mismatches: MigrationRecordMismatch[] = [];
  for (const field of comparedRecordFields) {
    const expectedValue = safeComparedValue(expected, field);
    const observedValue = safeComparedValue(actual, field);
    const expectedPresent = Object.prototype.hasOwnProperty.call(expected, field);
    const observedPresent = Object.prototype.hasOwnProperty.call(actual, field);
    if (
      expectedPresent === observedPresent &&
      (!expectedPresent || canonicalJson(expected[field]) === canonicalJson(actual[field]))
    ) {
      continue;
    }
    mismatches.push({
      field,
      expected: expectedValue,
      observed: observedValue,
      comparisonRule: comparisonRule(field)
    });
  }
  if (!mismatches.length) {
    mismatches.push({
      field: 'recordShape',
      expected: { kind: 'string', value: 'approved-fields-only' },
      observed: { kind: 'string', value: 'non-canonical-shape' },
      comparisonRule: comparisonRule('recordShape')
    });
  }
  return {
    reportVersion: MIGRATION_RECORD_MISMATCH_REPORT_VERSION,
    migrationIdentity: safeMigrationIdentity(actual, expected),
    normalizationVersion: MIGRATION_RECORD_NORMALIZATION_VERSION,
    mismatches
  };
}

function timestamp(value: Date | string | null) {
  if (value === null) return null;
  if (typeof value === 'string') {
    try {
      return canonicaliseMigrationTimestamp(value);
    } catch {
      throw new Error('Ledger contains a non-canonical timestamp.');
    }
  }
  const date = value;
  if (!Number.isFinite(date.getTime())) throw new Error('Ledger contains an invalid timestamp.');
  return date.toISOString();
}

export function normaliseMigrationRecord(row: MigrationLedgerRow): NormalisedMigrationRecord {
  const logs = row.logs ?? '';
  const appliedStepsCount = Number(row.applied_steps_count);
  if (!Number.isSafeInteger(appliedStepsCount) || appliedStepsCount < 0) {
    throw new Error('Ledger contains an invalid applied-step count.');
  }
  return {
    id: row.id,
    migrationName: row.migration_name,
    checksum: row.checksum,
    startedAt: timestamp(row.started_at)!,
    finishedAt: timestamp(row.finished_at),
    appliedStepsCount,
    rolledBackAt: timestamp(row.rolled_back_at),
    logsState: logs ? 'sha256' : 'none',
    logsDigest: logs ? createHash('sha256').update(logs, 'utf8').digest('hex') : null
  };
}

export function assertExactAttestedMigrationRecord(
  actual: NormalisedMigrationRecord,
  expected: AttestedMigrationRecord,
  label: string
) {
  const expectedComparable = { ...expected };
  if (canonicalJson(actual) !== canonicalJson(expectedComparable)) {
    throw new MigrationRecordMismatchError(label, mismatchReport(actual, expected));
  }
}

export type LedgerMode = 'production-status' | 'production-preflight' | 'production-postflight';

export function verifyAttestedLedger(input: {
  rows: MigrationLedgerRow[];
  manifest: MigrationManifest;
  attestation: LineageAttestation;
  mode: LedgerMode;
  approvedPendingMigrations: string[];
}) {
  const rows = input.rows.map(normaliseMigrationRecord).sort((a, b) => {
    const left = `${a.startedAt}\0${a.id}`;
    const right = `${b.startedAt}\0${b.id}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const grouped = new Map<string, NormalisedMigrationRecord[]>();
  for (const row of rows) {
    const records = grouped.get(row.migrationName) ?? [];
    records.push(row);
    grouped.set(row.migrationName, records);
  }

  const permittedNames = new Set([
    ...input.manifest.migrations.map((migration) => migration.name),
    input.attestation.missingMigration.migrationName
  ]);
  const unexpected = [...grouped.keys()].filter((name) => !permittedNames.has(name));
  if (unexpected.length) throw new Error(`Unexpected database migration record: ${unexpected.join(', ')}`);

  const missingRecords = grouped.get(input.attestation.missingMigration.migrationName) ?? [];
  if (missingRecords.length !== 1) throw new Error('Attested database-only migration is missing or ambiguous.');
  assertExactAttestedMigrationRecord(
    missingRecords[0],
    input.attestation.missingMigration,
    'Database-only migration'
  );

  const relatedRecords = grouped.get(input.attestation.relatedMigration.name) ?? [];
  if (relatedRecords.length !== 2) throw new Error('Related migration state is missing or ambiguous.');
  const failed = relatedRecords.find((record) => record.rolledBackAt !== null);
  const zeroStep = relatedRecords.find(
    (record) => record.finishedAt !== null && record.rolledBackAt === null && record.appliedStepsCount === 0
  );
  if (!failed || !zeroStep || failed === zeroStep) throw new Error('Related migration terminal states differ.');
  assertExactAttestedMigrationRecord(
    failed,
    input.attestation.relatedMigration.failedRecord,
    'Related failed record'
  );
  assertExactAttestedMigrationRecord(
    zeroStep,
    input.attestation.relatedMigration.completedZeroStepRecord,
    'Related zero-step record'
  );

  const pending: string[] = [];
  for (const migration of input.manifest.migrations) {
    if (migration.name === input.attestation.relatedMigration.name) continue;
    const records = grouped.get(migration.name) ?? [];
    if (!records.length) {
      pending.push(migration.name);
      continue;
    }
    if (records.length !== 1) throw new Error(`Repository migration is ambiguous: ${migration.name}`);
    const record = records[0];
    if (
      record.checksum !== migration.checksum ||
      record.finishedAt === null ||
      record.rolledBackAt !== null ||
      record.appliedStepsCount !== 1 ||
      record.logsState !== 'none'
    ) {
      throw new Error(`Repository migration is not an exact successful application: ${migration.name}`);
    }
  }

  const expectedPending =
    input.mode === 'production-postflight' ? [] : input.approvedPendingMigrations;
  if (JSON.stringify(pending) !== JSON.stringify(expectedPending)) {
    throw new Error(`Pending migration set differs: ${pending.join(', ') || 'none'}`);
  }
  return { rows, pending, appliedRepositoryCount: input.manifest.migrations.length - pending.length };
}
