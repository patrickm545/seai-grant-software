const sha256Pattern = /^[a-f0-9]{64}$/;
const fingerprintPattern = /^db_[a-f0-9]{16}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const wildcardPattern = /[*?]|\.\*/;

export const ATTESTATION_VERSION = 'clada-adr-0024-lineage-attestation/v1' as const;
export const ATTESTATION_ID = 'ADR-0024-PRODUCTION-2026-07-25' as const;
export const REQUIRED_APPROVAL_ROLES = [
  'CTO',
  'DATABASE_RELIABILITY_REVIEWER',
  'SECURITY_REVIEWER',
  'PRODUCTION_OWNER'
] as const;
const REQUIRED_RETIREMENT_CONDITIONS = [
  'Production database replacement',
  'Formal migration-history re-baseline',
  'Recovery of the checksum-identical original artifact',
  'Material schema-lineage change',
  'ADR-0024 superseded',
  'Supporting evidence invalidated'
] as const;

export type AttestationStatus = 'pending' | 'active' | 'withdrawn' | 'retired';
export type Approval = {
  role: (typeof REQUIRED_APPROVAL_ROLES)[number];
  status: 'pending' | 'approved';
  reviewer: string | null;
  approvedAt: string | null;
  evidenceReference: string | null;
};
export type AttestedMigrationRecord = {
  id: string | null;
  migrationName: string;
  checksum: string;
  startedAt: string;
  finishedAt: string | null;
  appliedStepsCount: number;
  rolledBackAt: string | null;
  logsState: 'none' | 'sha256';
  logsDigest: string | null;
};

export type LineageAttestation = {
  version: typeof ATTESTATION_VERSION;
  attestationId: typeof ATTESTATION_ID;
  status: AttestationStatus;
  incidentReference: 'ENG-INCIDENT-2026-07-25-PRODUCTION-MIGRATION-DRIFT';
  adrReference: 'ADR-0024';
  owner: 'Clada Systems Engineering';
  createdAt: string;
  reviewedAt: string | null;
  expiresAt: string;
  reason: string;
  historicalSqlKnown: false;
  retirementConditions: string[];
  evidenceReferences: string[];
  environment: 'production';
  approvedDatabaseFingerprint: 'db_4e1d3bd23cff6801';
  historicalEvidenceBaseline: '0ee3c67e8295ca8f988e5b60ec75b66c0f18741b';
  verifierImplementationVersion: string;
  approvedManifestHash: string;
  manifestVersion: 'clada-migration-manifest/v1';
  missingMigration: AttestedMigrationRecord;
  relatedMigration: {
    name: '20260428120000_manual_submission_prep';
    repositoryChecksum: '42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3';
    failedRecord: AttestedMigrationRecord;
    completedZeroStepRecord: AttestedMigrationRecord;
  };
  schema: {
    fingerprintVersion: 'clada-postgres-schema-fingerprint/v1';
    preMigrationFingerprint: string | null;
    postMigrationFingerprint: string | null;
    freshHeadFingerprint: string | null;
    namedAssertionsVersion: 'adr-0024-catalog-assertions/v1';
  };
  approvals: Approval[];
};

export class AttestationValidationError extends Error {
  constructor(
    public readonly code: 'ATTESTATION_INACTIVE' | 'ATTESTATION_EXPIRED' | 'ATTESTATION_INVALID',
    message: string
  ) {
    super(message);
    this.name = 'AttestationValidationError';
  }
}

function requirePinnedRecord(
  actual: AttestedMigrationRecord,
  expected: Omit<AttestedMigrationRecord, 'id' | 'logsDigest'>,
  label: string
) {
  const comparable = {
    migrationName: actual.migrationName,
    checksum: actual.checksum,
    startedAt: actual.startedAt,
    finishedAt: actual.finishedAt,
    appliedStepsCount: actual.appliedStepsCount,
    rolledBackAt: actual.rolledBackAt,
    logsState: actual.logsState
  };
  if (JSON.stringify(comparable) !== JSON.stringify(expected)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label} differs from ADR-0024.`);
  }
}

function requireExactString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim() || wildcardPattern.test(value)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label} must be an exact non-wildcard string.`);
  }
  return value;
}

function parseTimestamp(value: unknown, label: string) {
  const exact = requireExactString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(exact)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label} must be an exact UTC millisecond timestamp.`);
  }
  const parsed = Date.parse(exact);
  if (!Number.isFinite(parsed)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label} is invalid.`);
  }
  return parsed;
}

function validateRecord(record: AttestedMigrationRecord, label: string, active: boolean) {
  requireExactString(record.migrationName, `${label}.migrationName`);
  if (active && (!record.id || !uuidPattern.test(record.id))) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label}.id must be an exact UUID.`);
  }
  if (!sha256Pattern.test(record.checksum)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label}.checksum must be SHA-256.`);
  }
  parseTimestamp(record.startedAt, `${label}.startedAt`);
  if (record.finishedAt !== null) parseTimestamp(record.finishedAt, `${label}.finishedAt`);
  if (!Number.isInteger(record.appliedStepsCount) || record.appliedStepsCount < 0) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label}.appliedStepsCount is invalid.`);
  }
  if (record.rolledBackAt !== null) parseTimestamp(record.rolledBackAt, `${label}.rolledBackAt`);
  if (record.logsState === 'none' && record.logsDigest !== null) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label} no-log state cannot have a digest.`);
  }
  if (
    record.logsState === 'sha256' &&
    ((active && !record.logsDigest) || (record.logsDigest !== null && !sha256Pattern.test(record.logsDigest)))
  ) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label} log digest must be exact SHA-256.`);
  }
}

export function validateLineageAttestation(
  value: LineageAttestation,
  options: { now?: Date; requireActive?: boolean } = {}
) {
  if (value.version !== ATTESTATION_VERSION || value.attestationId !== ATTESTATION_ID) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Unsupported attestation identity or version.');
  }
  if (!['pending', 'active', 'withdrawn', 'retired'].includes(value.status)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Unsupported attestation status.');
  }
  if (
    value.environment !== 'production' ||
    value.approvedDatabaseFingerprint !== 'db_4e1d3bd23cff6801' ||
    !fingerprintPattern.test(value.approvedDatabaseFingerprint)
  ) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Attestation target identity is invalid.');
  }
  if (
    value.incidentReference !== 'ENG-INCIDENT-2026-07-25-PRODUCTION-MIGRATION-DRIFT' ||
    value.adrReference !== 'ADR-0024' ||
    value.owner !== 'Clada Systems Engineering' ||
    value.historicalSqlKnown !== false ||
    value.historicalEvidenceBaseline !== '0ee3c67e8295ca8f988e5b60ec75b66c0f18741b' ||
    value.manifestVersion !== 'clada-migration-manifest/v1' ||
    value.schema.fingerprintVersion !== 'clada-postgres-schema-fingerprint/v1' ||
    value.schema.namedAssertionsVersion !== 'adr-0024-catalog-assertions/v1'
  ) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Attestation governance identity is invalid.');
  }
  requireExactString(value.reason, 'reason');
  requireExactString(value.verifierImplementationVersion, 'verifierImplementationVersion');
  if (!value.retirementConditions.length || !value.evidenceReferences.length) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Lifecycle and evidence references are required.');
  }
  value.retirementConditions.forEach((item, index) => requireExactString(item, `retirementConditions[${index}]`));
  value.evidenceReferences.forEach((item, index) => requireExactString(item, `evidenceReferences[${index}]`));
  if (
    JSON.stringify([...value.retirementConditions].sort()) !==
    JSON.stringify([...REQUIRED_RETIREMENT_CONDITIONS].sort())
  ) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Retirement conditions must be exact.');
  }
  for (const requiredReference of [
    'INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md',
    'ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md',
    'MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md'
  ]) {
    if (!value.evidenceReferences.some((reference) => reference.endsWith(requiredReference))) {
      throw new AttestationValidationError('ATTESTATION_INVALID', `Missing evidence reference: ${requiredReference}`);
    }
  }
  if (!sha256Pattern.test(value.approvedManifestHash)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Approved manifest hash must be SHA-256.');
  }

  const active = value.status === 'active';
  validateRecord(value.missingMigration, 'missingMigration', active);
  validateRecord(value.relatedMigration.failedRecord, 'relatedMigration.failedRecord', active);
  validateRecord(value.relatedMigration.completedZeroStepRecord, 'relatedMigration.completedZeroStepRecord', active);
  requirePinnedRecord(
    value.missingMigration,
    {
      migrationName: '20260423093000_application_pack_admin_fields',
      checksum: 'affbde51faf1b8ccc731f575326d8dfdf2c21ec625565f516d5350ec5779f589',
      startedAt: '2026-04-23T07:04:10.395Z',
      finishedAt: '2026-04-23T07:04:10.527Z',
      appliedStepsCount: 1,
      rolledBackAt: null,
      logsState: 'none'
    },
    'Missing migration'
  );
  requirePinnedRecord(
    value.relatedMigration.failedRecord,
    {
      migrationName: '20260428120000_manual_submission_prep',
      checksum: '42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3',
      startedAt: '2026-04-29T06:01:05.497Z',
      finishedAt: null,
      appliedStepsCount: 0,
      rolledBackAt: '2026-04-29T06:01:38.423Z',
      logsState: 'sha256'
    },
    'Related failed record'
  );
  requirePinnedRecord(
    value.relatedMigration.completedZeroStepRecord,
    {
      migrationName: '20260428120000_manual_submission_prep',
      checksum: '42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3',
      startedAt: '2026-04-29T06:01:38.543Z',
      finishedAt: '2026-04-29T06:01:38.543Z',
      appliedStepsCount: 0,
      rolledBackAt: null,
      logsState: 'none'
    },
    'Related zero-step record'
  );
  if (
    value.relatedMigration.name !== '20260428120000_manual_submission_prep' ||
    value.relatedMigration.repositoryChecksum !==
      '42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3'
  ) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Related migration identity is invalid.');
  }

  const created = parseTimestamp(value.createdAt, 'createdAt');
  const expiry = parseTimestamp(value.expiresAt, 'expiresAt');
  if (expiry <= created || expiry - created > 90 * 24 * 60 * 60 * 1000) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Attestation expiry must be within 90 days.');
  }
  const approvals = new Map(value.approvals.map((approval) => [approval.role, approval]));
  for (const role of REQUIRED_APPROVAL_ROLES) {
    const approval = approvals.get(role);
    if (!approval) throw new AttestationValidationError('ATTESTATION_INVALID', `Missing ${role} approval.`);
    if (active) {
      if (
        approval.status !== 'approved' ||
        !approval.reviewer ||
        !approval.approvedAt ||
        !approval.evidenceReference
      ) {
        throw new AttestationValidationError('ATTESTATION_INVALID', `${role} approval is incomplete.`);
      }
      parseTimestamp(approval.approvedAt, `${role}.approvedAt`);
      requireExactString(approval.reviewer, `${role}.reviewer`);
      requireExactString(approval.evidenceReference, `${role}.evidenceReference`);
    }
  }
  if (new Set(value.approvals.map((approval) => approval.role)).size !== REQUIRED_APPROVAL_ROLES.length) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Approval roles must be unique and exact.');
  }
  if (active) {
    for (const [label, fingerprint] of Object.entries({
      preMigrationFingerprint: value.schema.preMigrationFingerprint,
      postMigrationFingerprint: value.schema.postMigrationFingerprint,
      freshHeadFingerprint: value.schema.freshHeadFingerprint
    })) {
      if (!fingerprint || !sha256Pattern.test(fingerprint)) {
        throw new AttestationValidationError('ATTESTATION_INVALID', `${label} must be an approved SHA-256 value.`);
      }
    }
    if (!value.reviewedAt) {
      throw new AttestationValidationError('ATTESTATION_INVALID', 'Active attestation requires a review timestamp.');
    }
    parseTimestamp(value.reviewedAt, 'reviewedAt');
  }

  if (options.requireActive) {
    if (!active) throw new AttestationValidationError('ATTESTATION_INACTIVE', `Attestation is ${value.status}.`);
    if ((options.now ?? new Date()).getTime() >= expiry) {
      throw new AttestationValidationError('ATTESTATION_EXPIRED', 'Attestation has expired.');
    }
  }
  return value;
}
