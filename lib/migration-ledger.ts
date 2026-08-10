import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json';
import {
  PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES,
  type LineageAttestation,
  type AttestedMigrationRecord,
  type AttestedRepositoryChecksumDivergence,
  type AttestedHistoricalResolvedMigration
} from './lineage-attestation';
import { PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS } from './historical-resolved-migration';
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
export const REPOSITORY_MIGRATION_EXACT_SUCCESS_REPORT_VERSION =
  'adr-0024-repository-migration-exact-success/v1' as const;

export type MigrationRecordNormalizationFailure =
  | 'non-canonical-timestamp'
  | 'invalid-timestamp'
  | 'invalid-applied-step-count';

export class MigrationRecordNormalizationError extends Error {
  constructor(
    public readonly field: 'startedAt' | 'finishedAt' | 'rolledBackAt' | 'appliedStepsCount',
    public readonly reason: MigrationRecordNormalizationFailure
  ) {
    super(
      `Migration ledger normalization failed: field=${field}; reason=${reason}; ` +
        `normalizationVersion=${MIGRATION_RECORD_NORMALIZATION_VERSION}`
    );
    this.name = 'MigrationRecordNormalizationError';
  }
}

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

export type RepositoryMigrationExactSuccessReason =
  | 'missing-record'
  | 'duplicate-records'
  | 'migration-name-mismatch'
  | 'checksum-mismatch'
  | 'unfinished'
  | 'rolled-back'
  | 'applied-step-count-mismatch'
  | 'unexpected-log-state'
  | 'unexpected-log-digest'
  | 'unexpected-lifecycle-state';

export type RepositoryMigrationExactSuccessFailure = {
  reason: RepositoryMigrationExactSuccessReason;
  field: 'recordCount' | ComparedRecordField | 'lifecycle';
  expected: SafeComparedValue;
  observed: SafeComparedValue;
  comparisonRule: string;
};

export type RepositoryMigrationExactSuccessReport = {
  reportVersion: typeof REPOSITORY_MIGRATION_EXACT_SUCCESS_REPORT_VERSION;
  migrationName: string;
  normalizationVersion: typeof MIGRATION_RECORD_NORMALIZATION_VERSION;
  recordCount: number;
  recordIds: SafeComparedValue[];
  failures: RepositoryMigrationExactSuccessFailure[];
};

export class RepositoryMigrationExactSuccessError extends Error {
  constructor(public readonly report: RepositoryMigrationExactSuccessReport) {
    super(
      `Repository migration is not an exact successful application: ${report.migrationName}; exactSuccessReport=${canonicalJson(report)}`
    );
    this.name = 'RepositoryMigrationExactSuccessError';
  }
}

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

function safeLiteral(value: string): SafeComparedValue {
  return { kind: 'string', value };
}

function exactSuccessFailure(
  reason: RepositoryMigrationExactSuccessReason,
  field: RepositoryMigrationExactSuccessFailure['field'],
  expected: SafeComparedValue,
  observed: SafeComparedValue,
  rule: string
): RepositoryMigrationExactSuccessFailure {
  return { reason, field, expected, observed, comparisonRule: rule };
}

function lifecycleState(record: NormalisedMigrationRecord) {
  if (record.finishedAt === null && record.rolledBackAt !== null) return 'unfinished-and-rolled-back';
  if (record.rolledBackAt !== null) return 'rolled-back';
  if (record.finishedAt === null) return 'unfinished';
  return 'finished-not-rolled-back';
}

export function repositoryMigrationExactSuccessReport(
  records: NormalisedMigrationRecord[],
  migration: Pick<MigrationManifest['migrations'][number], 'name' | 'checksum'>
): RepositoryMigrationExactSuccessReport | null {
  const failures: RepositoryMigrationExactSuccessFailure[] = [];
  if (records.length === 0) {
    failures.push(
      exactSuccessFailure(
        'missing-record',
        'recordCount',
        { kind: 'number', value: 1 },
        { kind: 'number', value: 0 },
        'exactly one ledger row must exist for the repository migration'
      )
    );
  } else if (records.length !== 1) {
    failures.push(
      exactSuccessFailure(
        'duplicate-records',
        'recordCount',
        { kind: 'number', value: 1 },
        { kind: 'number', value: records.length },
        'exactly one ledger row must exist for the repository migration'
      )
    );
  } else {
    const record = records[0];
    if (record.migrationName !== migration.name) {
      failures.push(
        exactSuccessFailure(
          'migration-name-mismatch',
          'migrationName',
          safeComparedValue({ migrationName: migration.name }, 'migrationName'),
          safeComparedValue(record, 'migrationName'),
          'exact repository manifest migration name'
        )
      );
    }
    if (record.checksum !== migration.checksum) {
      failures.push(
        exactSuccessFailure(
          'checksum-mismatch',
          'checksum',
          safeComparedValue({ checksum: migration.checksum }, 'checksum'),
          safeComparedValue(record, 'checksum'),
          'exact immutable-manifest SHA-256 checksum'
        )
      );
    }
    if (record.finishedAt === null) {
      failures.push(
        exactSuccessFailure(
          'unfinished',
          'finishedAt',
          safeLiteral('present-valid-canonical-utc-timestamp'),
          { kind: 'null', value: null },
          'finishedAt must be a present valid canonical UTC timestamp'
        )
      );
    }
    if (record.rolledBackAt !== null) {
      failures.push(
        exactSuccessFailure(
          'rolled-back',
          'rolledBackAt',
          { kind: 'null', value: null },
          safeComparedValue(record, 'rolledBackAt'),
          'rolledBackAt must be null'
        )
      );
    }
    if (record.appliedStepsCount !== 1) {
      failures.push(
        exactSuccessFailure(
          'applied-step-count-mismatch',
          'appliedStepsCount',
          { kind: 'number', value: 1 },
          safeComparedValue(record, 'appliedStepsCount'),
          'appliedStepsCount must equal one'
        )
      );
    }
    if (record.logsState !== 'none') {
      failures.push(
        exactSuccessFailure(
          'unexpected-log-state',
          'logsState',
          safeLiteral('none'),
          safeComparedValue(record, 'logsState'),
          'normalized logs state must equal none; raw logs are excluded'
        )
      );
    }
    if (record.logsDigest !== null) {
      failures.push(
        exactSuccessFailure(
          'unexpected-log-digest',
          'logsDigest',
          { kind: 'null', value: null },
          safeComparedValue(record, 'logsDigest'),
          'normalized logs digest must be null; raw logs are excluded'
        )
      );
    }
    const observedLifecycle = lifecycleState(record);
    if (observedLifecycle !== 'finished-not-rolled-back') {
      failures.push(
        exactSuccessFailure(
          'unexpected-lifecycle-state',
          'lifecycle',
          safeLiteral('finished-not-rolled-back'),
          safeLiteral(observedLifecycle),
          'lifecycle must be finished and not rolled back'
        )
      );
    }
  }
  if (!failures.length) return null;
  return {
    reportVersion: REPOSITORY_MIGRATION_EXACT_SUCCESS_REPORT_VERSION,
    migrationName:
      safeComparedValue({ migrationName: migration.name }, 'migrationName').kind === 'string'
        ? migration.name
        : '[redacted-invalid-format]',
    normalizationVersion: MIGRATION_RECORD_NORMALIZATION_VERSION,
    recordCount: records.length,
    recordIds: records
      .map((record) => safeComparedValue(record, 'id'))
      .sort((left, right) => {
        const leftJson = canonicalJson(left);
        const rightJson = canonicalJson(right);
        return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
      }),
    failures
  };
}

export function assertExactSuccessfulRepositoryMigration(
  records: NormalisedMigrationRecord[],
  migration: Pick<MigrationManifest['migrations'][number], 'name' | 'checksum'>
) {
  const report = repositoryMigrationExactSuccessReport(records, migration);
  if (report) throw new RepositoryMigrationExactSuccessError(report);
}

function isExactAttestedProductionChecksumDivergence(input: {
  records: NormalisedMigrationRecord[];
  migration: Pick<MigrationManifest['migrations'][number], 'name' | 'checksum'>;
  attestation: LineageAttestation;
  expected: AttestedRepositoryChecksumDivergence;
}) {
  const [record] = input.records;
  const expected = input.expected;
  return (
    (input.attestation.status === 'pending' || input.attestation.status === 'active') &&
    canonicalJson(input.attestation.repositoryMigrationChecksumDivergences) ===
      canonicalJson(PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES) &&
    input.attestation.approvedDatabaseFingerprint === expected.productionDatabaseFingerprint &&
    input.attestation.approvedManifestHash === expected.approvedManifestHash &&
    input.migration.name === expected.migrationName &&
    input.migration.checksum === expected.repositoryChecksum &&
    input.records.length === 1 &&
    record.id === expected.recordId &&
    record.migrationName === expected.migrationName &&
    record.checksum === expected.observedProductionChecksum &&
    record.finishedAt !== null &&
    record.rolledBackAt === null &&
    record.appliedStepsCount === expected.expectedLifecycle.appliedStepsCount &&
    record.logsState === expected.expectedLifecycle.logsState &&
    record.logsDigest === expected.expectedLifecycle.logsDigest
  );
}

export type HistoricalResolvedMigrationMode =
  | 'ordinary-only'
  | 'pending-evidence-capture'
  | 'active-attestation';

function assertExactHistoricalResolvedMigration(input: {
  records: NormalisedMigrationRecord[];
  migration: Pick<MigrationManifest['migrations'][number], 'name' | 'checksum'>;
  attestation: LineageAttestation;
  historical: AttestedHistoricalResolvedMigration;
  mode: Exclude<HistoricalResolvedMigrationMode, 'ordinary-only'>;
}) {
  const { exactLedgerTimestamps, observedCurrentSchema, r14Evidence, ...knownFields } =
    input.historical;
  if (
    canonicalJson(knownFields) !== canonicalJson(PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS) ||
    input.historical.environment !== 'production' ||
    input.historical.productionDatabaseFingerprint !==
      input.attestation.approvedDatabaseFingerprint ||
    input.historical.approvedManifestHash !== input.attestation.approvedManifestHash ||
    input.migration.name !== input.historical.migrationName ||
    input.migration.checksum !== input.historical.repositoryChecksum
  ) {
    throw new Error('Historical resolved migration scope differs from the exact ADR-0024 state.');
  }
  if (
    (input.mode === 'pending-evidence-capture' &&
      (input.attestation.status !== 'pending' ||
        exactLedgerTimestamps.startedAt !== null ||
        exactLedgerTimestamps.finishedAt !== null ||
        observedCurrentSchema.fingerprint !== null ||
        r14Evidence.changeId !== null)) ||
    (input.mode === 'active-attestation' &&
      (input.attestation.status !== 'active' ||
        exactLedgerTimestamps.startedAt === null ||
        exactLedgerTimestamps.finishedAt === null ||
        observedCurrentSchema.fingerprint === null ||
        r14Evidence.changeId === null))
  ) {
    throw new Error('Historical resolved migration attestation lifecycle is incomplete.');
  }
  if (input.records.length !== 1) {
    throw new Error('Historical resolved migration record is missing or ambiguous.');
  }
  const record = input.records[0];
  const expected: AttestedMigrationRecord = {
    id: input.historical.recordId,
    migrationName: input.historical.migrationName,
    checksum: input.historical.observedProductionChecksum,
    startedAt:
      input.mode === 'active-attestation'
        ? exactLedgerTimestamps.startedAt!
        : record.startedAt,
    finishedAt:
      input.mode === 'active-attestation'
        ? exactLedgerTimestamps.finishedAt!
        : record.finishedAt,
    appliedStepsCount: input.historical.expectedAppliedStepsCount,
    rolledBackAt: input.historical.expectedRolledBackAt,
    logsState: input.historical.expectedLogsState,
    logsDigest: input.historical.expectedLogsDigest
  };
  if (record.finishedAt === null) {
    throw new Error('Historical resolved migration must have a finished timestamp.');
  }
  assertExactAttestedMigrationRecord(record, expected, 'Historical resolved migration');
  return record;
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

function timestamp(
  value: Date | string | null,
  field: 'startedAt' | 'finishedAt' | 'rolledBackAt'
) {
  if (value === null) return null;
  if (typeof value === 'string') {
    try {
      return canonicaliseMigrationTimestamp(value);
    } catch {
      throw new MigrationRecordNormalizationError(field, 'non-canonical-timestamp');
    }
  }
  const date = value;
  if (!Number.isFinite(date.getTime())) {
    throw new MigrationRecordNormalizationError(field, 'invalid-timestamp');
  }
  return date.toISOString();
}

export function normaliseMigrationRecord(row: MigrationLedgerRow): NormalisedMigrationRecord {
  const logs = row.logs ?? '';
  const appliedStepsCount = Number(row.applied_steps_count);
  if (!Number.isSafeInteger(appliedStepsCount) || appliedStepsCount < 0) {
    throw new MigrationRecordNormalizationError(
      'appliedStepsCount',
      'invalid-applied-step-count'
    );
  }
  return {
    id: row.id,
    migrationName: row.migration_name,
    checksum: row.checksum,
    startedAt: timestamp(row.started_at, 'startedAt')!,
    finishedAt: timestamp(row.finished_at, 'finishedAt'),
    appliedStepsCount,
    rolledBackAt: timestamp(row.rolled_back_at, 'rolledBackAt'),
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
  historicalResolvedMigrationMode?: HistoricalResolvedMigrationMode;
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
  const verifiedRepositoryChecksumDivergences = new Set<string>();
  const verifiedHistoricalResolvedMigrations: Array<{
    migrationName: string;
    result: 'captured-for-pending-attestation' | 'verified';
    record: NormalisedMigrationRecord;
  }> = [];
  for (const migration of input.manifest.migrations) {
    if (migration.name === input.attestation.relatedMigration.name) continue;
    const records = grouped.get(migration.name) ?? [];
    if (!records.length) {
      const expectedPending =
        input.mode !== 'production-postflight' &&
        input.approvedPendingMigrations.includes(migration.name);
      if (!expectedPending) assertExactSuccessfulRepositoryMigration(records, migration);
      pending.push(migration.name);
      continue;
    }
    const checksumDivergence = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
      (candidate) => candidate.migrationName === migration.name
    );
    if (checksumDivergence) {
      if (
        !isExactAttestedProductionChecksumDivergence({
          records,
          migration,
          attestation: input.attestation,
          expected: checksumDivergence
        })
      ) {
        const report = repositoryMigrationExactSuccessReport(records, migration);
        if (report) throw new RepositoryMigrationExactSuccessError(report);
        throw new Error(
          'Production repository checksum divergence record differs from the exact ADR-0024 attestation.'
        );
      }
      verifiedRepositoryChecksumDivergences.add(migration.name);
      continue;
    }
    const historicalResolved = input.attestation.historicalResolvedMigrations.find(
      (candidate) => candidate.migrationName === migration.name
    );
    const historicalMode = input.historicalResolvedMigrationMode ?? 'ordinary-only';
    if (historicalResolved && historicalMode !== 'ordinary-only') {
      const record = assertExactHistoricalResolvedMigration({
        records,
        migration,
        attestation: input.attestation,
        historical: historicalResolved,
        mode: historicalMode
      });
      verifiedHistoricalResolvedMigrations.push({
        migrationName: migration.name,
        result:
          historicalMode === 'pending-evidence-capture'
            ? 'captured-for-pending-attestation'
            : 'verified',
        record
      });
      continue;
    }
    assertExactSuccessfulRepositoryMigration(records, migration);
  }

  const expectedPending =
    input.mode === 'production-postflight' ? [] : input.approvedPendingMigrations;
  if (JSON.stringify(pending) !== JSON.stringify(expectedPending)) {
    throw new Error(`Pending migration set differs: ${pending.join(', ') || 'none'}`);
  }
  if (
    verifiedRepositoryChecksumDivergences.size !==
      PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.length ||
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (divergence) => !verifiedRepositoryChecksumDivergences.has(divergence.migrationName)
    )
  ) {
    throw new Error('Production repository checksum divergence records were not verified.');
  }
  const expectedHistoricalCount =
    (input.historicalResolvedMigrationMode ?? 'ordinary-only') === 'ordinary-only'
      ? 0
      : input.attestation.historicalResolvedMigrations.length;
  if (verifiedHistoricalResolvedMigrations.length !== expectedHistoricalCount) {
    throw new Error('Historical resolved migration records were not verified exactly.');
  }
  return {
    rows,
    pending,
    appliedRepositoryCount: input.manifest.migrations.length - pending.length,
    repositoryChecksumDivergence: 'verified' as const,
    repositoryChecksumDivergences: PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.map(
      (divergence) => ({ migrationName: divergence.migrationName, result: 'verified' as const })
    ),
    historicalResolvedMigrations: verifiedHistoricalResolvedMigrations
  };
}
