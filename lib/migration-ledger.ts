import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json';
import type { LineageAttestation, AttestedMigrationRecord } from './lineage-attestation';
import type { MigrationManifest } from './migration-manifest';

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

function timestamp(value: Date | string | null) {
  if (value === null) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d{3,6})Z$/);
    if (!match) throw new Error('Ledger contains a non-canonical timestamp.');
    const fraction = match[2].replace(/0+$/, '').padEnd(3, '0');
    return `${match[1]}.${fraction}Z`;
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

function exactRecord(actual: NormalisedMigrationRecord, expected: AttestedMigrationRecord, label: string) {
  const expectedComparable = { ...expected };
  if (canonicalJson(actual) !== canonicalJson(expectedComparable)) {
    throw new Error(`${label} metadata differs from the attestation.`);
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
  exactRecord(missingRecords[0], input.attestation.missingMigration, 'Database-only migration');

  const relatedRecords = grouped.get(input.attestation.relatedMigration.name) ?? [];
  if (relatedRecords.length !== 2) throw new Error('Related migration state is missing or ambiguous.');
  const failed = relatedRecords.find((record) => record.rolledBackAt !== null);
  const zeroStep = relatedRecords.find(
    (record) => record.finishedAt !== null && record.rolledBackAt === null && record.appliedStepsCount === 0
  );
  if (!failed || !zeroStep || failed === zeroStep) throw new Error('Related migration terminal states differ.');
  exactRecord(failed, input.attestation.relatedMigration.failedRecord, 'Related failed record');
  exactRecord(zeroStep, input.attestation.relatedMigration.completedZeroStepRecord, 'Related zero-step record');

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
