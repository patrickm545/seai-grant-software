import { isCanonicalMigrationTimestamp } from './migration-timestamp';
import { canonicalJson } from './canonical-json';
import {
  HISTORICAL_RESOLVED_CATALOG_ASSERTIONS_VERSION,
  PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS
} from './historical-resolved-migration';

const sha256Pattern = /^[a-f0-9]{64}$/;
const fingerprintPattern = /^db_[a-f0-9]{16}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const wildcardPattern = /[*?]|\.\*/;
const placeholderApprovalPattern =
  /^(?:unknown|tbd|todo|placeholder|reviewer(?:-\d+)?|codex|chatgpt|openai)$/i;
const repositoryApprovalEvidencePattern = /^docs\/[A-Za-z0-9_./-]+\.md$/;

export const ATTESTATION_VERSION = 'clada-adr-0024-lineage-attestation/v5' as const;
export const ATTESTATION_ID = 'ADR-0024-PRODUCTION-2026-07-25' as const;
export const PILOT_STAGE_ACCOUNTABLE_PERSON = 'Patrick McKenna' as const;
export const PILOT_STAGE_SCOPE =
  'Pilot-stage read-only ADR-0024 Production evidence capture, status verification and attestation activation only' as const;
export const PILOT_STAGE_TECHNICAL_REVIEW_METHOD =
  'AI-assisted CTO review using retained deterministic evidence, repository-enforced controls and CEO accountability; AI is not a human approver' as const;
export const PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT =
  'I acknowledge that no independent human technical reviewer is currently available and accept final accountability for this pilot-stage read-only evidence and attestation operation' as const;
export const PILOT_STAGE_LATER_REVIEW_TRIGGER =
  'Before onboarding the first 10 pilot installers or when another engineer or qualified external database reviewer joins, whichever occurs first' as const;
export const PILOT_STAGE_PROHIBITED_ACTIONS = [
  'Production migration execution',
  'Application deployment',
  'Alias movement'
] as const;
export const REQUIRED_APPROVAL_ROLES = [
  'CTO',
  'DATABASE_RELIABILITY_REVIEWER',
  'SECURITY_REVIEWER',
  'PRODUCTION_OWNER'
] as const;
export const REQUIRED_APPROVAL_SCOPE =
  'ADR-0024 single-incident Production lineage evidence and attestation activation' as const;
export const REQUIRED_APPROVAL_ACKNOWLEDGEMENTS = [
  'Historical SQL remains unknown',
  'Existing Production migration records remain untouched',
  'Schema equivalence is operational evidence only',
  'No Production migration has been applied',
  'Production migration execution remains separately approved',
  'Preview lineage was repaired independently and receives no Production exception'
] as const;
export const PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES = [
  {
    migrationName: '20260710120000_identity_organisation_foundation',
    recordId: '112c6124-f0c2-4b6b-8d02-f6ce835746e3',
    repositoryChecksum: 'fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3',
    observedProductionChecksum: 'c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714',
    checksumDivergenceClassification: 'A-exact-alternate-byte-representation-proven',
    byteRepresentation: 'utf8-no-bom-crlf-with-final-newline',
    checksumEvidenceReference:
      'docs/03-engineering/evidence/ADR_0024_R10_CHECKSUM_DIVERGENCE.json',
    checksumEvidenceSha256:
      '1a9e69ad0be6fd7127be11cee7f993da6418d5f7a4e0f8431a67cd83d0252a65',
    environment: 'production',
    productionDatabaseFingerprint: 'db_4e1d3bd23cff6801',
    approvedRepositoryLineageBaseline: '1949ebe495801b26f6f59d2785a6b86b2864b153',
    approvedManifestHash: '1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872',
    expectedLifecycle: {
      startedAt: 'present-valid-canonical-utc-timestamp',
      finishedAt: 'present-valid-canonical-utc-timestamp',
      appliedStepsCount: 1,
      rolledBackAt: null,
      logsState: 'none',
      logsDigest: null
    },
    scope: 'Exact ADR-0024 Production historical record only',
    retirementCondition: 'Retires with ADR-0024 attestation'
  },
  {
    migrationName: '20260710130000_users_roles_permissions_audit',
    recordId: '93c04529-1d5b-4350-af01-ef225b69b008',
    repositoryChecksum: 'cfebbcb43d7922fc8443b5562a57286e326971db2d6c664f5a06de82030537bf',
    observedProductionChecksum: '4d6442c505228abcfde3c1a1be960c27ec25bf96c5955077dfe003423bb34cfb',
    checksumDivergenceClassification: 'A-exact-alternate-byte-representation-proven',
    byteRepresentation: 'utf8-no-bom-crlf-with-final-newline',
    checksumEvidenceReference:
      'docs/03-engineering/evidence/ADR_0024_R11_CHECKSUM_DIVERGENCE.json',
    checksumEvidenceSha256:
      '0eed74ab3945d45a0915631a99824fd7a2ecd7ec5cb7653ffbb3e80fd54b6eed',
    environment: 'production',
    productionDatabaseFingerprint: 'db_4e1d3bd23cff6801',
    approvedRepositoryLineageBaseline: '3281da65c013e9ad63dbc6c5da507640db586452',
    approvedManifestHash: '1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872',
    expectedLifecycle: {
      startedAt: 'present-valid-canonical-utc-timestamp',
      finishedAt: 'present-valid-canonical-utc-timestamp',
      appliedStepsCount: 1,
      rolledBackAt: null,
      logsState: 'none',
      logsDigest: null
    },
    scope: 'Exact ADR-0024 Production historical record only',
    retirementCondition: 'Retires with ADR-0024 attestation'
  },
  {
    migrationName: '20260710140000_workflow_foundation',
    recordId: 'ce4489c9-fa9b-41e0-90fc-23a584e162da',
    repositoryChecksum: '7874c3e8fe00b0b0058e4147508e03b2c617b2910b34f707179fc9f3e994110d',
    observedProductionChecksum: 'fbcc4133e665566e6aadd542c094dcc527d565a64ca0339f054025f4e8b709f8',
    checksumDivergenceClassification: 'A-exact-alternate-byte-representation-proven',
    byteRepresentation: 'utf8-no-bom-crlf-with-final-newline',
    checksumEvidenceReference:
      'docs/03-engineering/evidence/ADR_0024_R12_CHECKSUM_DIVERGENCE.json',
    checksumEvidenceSha256:
      '0b773879debbf8250f4a5f67c06d2ce9fbb31c2d2774b9d79089a7cefe60c915',
    environment: 'production',
    productionDatabaseFingerprint: 'db_4e1d3bd23cff6801',
    approvedRepositoryLineageBaseline: 'a60da87c62bb22d406f3e36f8484a13d14086a32',
    approvedManifestHash: '1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872',
    expectedLifecycle: {
      startedAt: 'present-valid-canonical-utc-timestamp',
      finishedAt: 'present-valid-canonical-utc-timestamp',
      appliedStepsCount: 1,
      rolledBackAt: null,
      logsState: 'none',
      logsDigest: null
    },
    scope: 'Exact ADR-0024 Production historical record only',
    retirementCondition: 'Retires with ADR-0024 attestation'
  }
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
  scopeAccepted: string | null;
  acknowledgements: string[];
  conditions: string[];
};
export type GovernanceMode =
  | 'standard-independent-human'
  | 'pilot-stage-compensating-control';
export type PilotStageCaptureEvidence = {
  artifactReference: string;
  artifactSha256: string;
  deterministicEvidenceDigest: string;
  repositoryRevision: string;
  changeId: string;
  databaseFingerprint: 'db_4e1d3bd23cff6801';
  connectedDatabaseName: string;
  operator: typeof PILOT_STAGE_ACCOUNTABLE_PERSON;
  restorePointReference: string;
  schemaFingerprint: string;
  namedAssertionsVersion: 'adr-0024-catalog-assertions/v2';
};
export type PilotStageCompensatingControl = {
  scope: typeof PILOT_STAGE_SCOPE;
  chiefExecutiveOfficer: typeof PILOT_STAGE_ACCOUNTABLE_PERSON;
  productionOwner: typeof PILOT_STAGE_ACCOUNTABLE_PERSON;
  productionOperator: typeof PILOT_STAGE_ACCOUNTABLE_PERSON;
  recoveryOwner: typeof PILOT_STAGE_ACCOUNTABLE_PERSON;
  finalAccountableApprover: typeof PILOT_STAGE_ACCOUNTABLE_PERSON;
  technicalReviewMethod: typeof PILOT_STAGE_TECHNICAL_REVIEW_METHOD;
  independentHumanTechnicalReviewer: null;
  independentHumanTechnicalReviewerStatus: 'unavailable-during-pilot-stage';
  accountabilityAcknowledgement: typeof PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT;
  laterQualifiedHumanReviewRequired: true;
  laterQualifiedHumanReviewTrigger: typeof PILOT_STAGE_LATER_REVIEW_TRIGGER;
  prohibitedActions: string[];
  activatedAt: string | null;
  captures: PilotStageCaptureEvidence[];
  repeatedDeterministicFieldsMatch: boolean | null;
  requiredProductionStatusDecision: 'verified-pending-blocked';
  requiredProductionStatusExitCode: 20;
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

export type AttestedRepositoryChecksumDivergence =
  (typeof PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES)[number];

export type AttestedHistoricalResolvedMigration =
  typeof PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS & {
    exactLedgerTimestamps: {
      startedAt: string | null;
      finishedAt: string | null;
    };
    observedCurrentSchema: {
      fingerprintVersion: 'clada-postgres-schema-fingerprint/v2';
      fingerprint: string | null;
      catalogAssertionsVersion: typeof HISTORICAL_RESOLVED_CATALOG_ASSERTIONS_VERSION;
      catalogAssertionsDigest: string | null;
      evidenceReference: string | null;
      evidenceSha256: string | null;
    };
    r14Evidence: {
      changeId: string | null;
      repositoryRevision: string | null;
      captureArtifactReferences: string[];
      captureArtifactSha256s: string[];
      recoveryEvidenceReference: string | null;
    };
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
  expiresAt: string | null;
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
  repositoryMigrationChecksumDivergences: typeof PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES;
  historicalResolvedMigrations: [AttestedHistoricalResolvedMigration];
  missingMigration: AttestedMigrationRecord;
  relatedMigration: {
    name: '20260428120000_manual_submission_prep';
    repositoryChecksum: '42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3';
    failedRecord: AttestedMigrationRecord;
    completedZeroStepRecord: AttestedMigrationRecord;
  };
  schema: {
    fingerprintVersion: 'clada-postgres-schema-fingerprint/v2';
    preMigrationFingerprint: string | null;
    postMigrationFingerprint: string | null;
    freshHeadFingerprint: string | null;
    namedAssertionsVersion: 'adr-0024-catalog-assertions/v2';
  };
  governanceMode: GovernanceMode;
  pilotStageCompensatingControl: PilotStageCompensatingControl | null;
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

function requireHumanApprovalString(value: unknown, label: string) {
  const exact = requireExactString(value, label);
  if (placeholderApprovalPattern.test(exact)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label} cannot be a placeholder.`);
  }
  return exact;
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

function requireCanonicalMigrationTimestamp(value: unknown, label: string) {
  const exact = requireExactString(value, label);
  if (!isCanonicalMigrationTimestamp(exact)) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      `${label} must already be an exact canonical UTC timestamp with 3 to 6 fractional digits and no insignificant trailing zero.`
    );
  }
  return exact;
}

function validateApproval(
  approval: Approval,
  role: Approval['role'],
  value: LineageAttestation,
  created: number,
  reviewed: number
) {
  if (
    approval.status !== 'approved' ||
    !approval.reviewer ||
    !approval.approvedAt ||
    !approval.evidenceReference
  ) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${role} approval is incomplete.`);
  }
  const approved = parseTimestamp(approval.approvedAt, `${role}.approvedAt`);
  requireHumanApprovalString(approval.reviewer, `${role}.reviewer`);
  const evidenceReference = requireHumanApprovalString(
    approval.evidenceReference,
    `${role}.evidenceReference`
  );
  if (
    !repositoryApprovalEvidencePattern.test(evidenceReference) ||
    evidenceReference.split('/').includes('..')
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      `${role} approval evidence must be a repository Markdown path.`
    );
  }
  if (approval.scopeAccepted !== REQUIRED_APPROVAL_SCOPE) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${role} approval scope is incomplete.`);
  }
  if (
    JSON.stringify(approval.acknowledgements) !==
    JSON.stringify(REQUIRED_APPROVAL_ACKNOWLEDGEMENTS)
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      `${role} approval acknowledgements are incomplete.`
    );
  }
  if (!Array.isArray(approval.conditions)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${role} approval conditions are invalid.`);
  }
  approval.conditions.forEach((condition, index) =>
    requireExactString(condition, `${role}.conditions[${index}]`)
  );
  if (!value.evidenceReferences.includes(approval.evidenceReference)) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      `${role} approval evidence is not indexed.`
    );
  }
  if (approved < created || approved > reviewed) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Approval and review timestamps must fall within the attestation lifecycle.'
    );
  }
}

function validatePilotStageGovernance(
  value: LineageAttestation,
  active: boolean,
  created: number,
  reviewed: number | null,
  expiry: number | null
) {
  const pilot = value.pilotStageCompensatingControl;
  if (!pilot) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Pilot-stage compensating-control governance is required.'
    );
  }
  if (
    pilot.scope !== PILOT_STAGE_SCOPE ||
    pilot.chiefExecutiveOfficer !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
    pilot.productionOwner !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
    pilot.productionOperator !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
    pilot.recoveryOwner !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
    pilot.finalAccountableApprover !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
    pilot.technicalReviewMethod !== PILOT_STAGE_TECHNICAL_REVIEW_METHOD ||
    pilot.independentHumanTechnicalReviewer !== null ||
    pilot.independentHumanTechnicalReviewerStatus !== 'unavailable-during-pilot-stage' ||
    pilot.accountabilityAcknowledgement !== PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT ||
    pilot.laterQualifiedHumanReviewRequired !== true ||
    pilot.laterQualifiedHumanReviewTrigger !== PILOT_STAGE_LATER_REVIEW_TRIGGER ||
    JSON.stringify(pilot.prohibitedActions) !== JSON.stringify(PILOT_STAGE_PROHIBITED_ACTIONS) ||
    pilot.requiredProductionStatusDecision !== 'verified-pending-blocked' ||
    pilot.requiredProductionStatusExitCode !== 20
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Pilot-stage governance allocation and compensating controls must be exact.'
    );
  }
  if (!active) {
    if (
      pilot.activatedAt !== null ||
      pilot.captures.length !== 0 ||
      pilot.repeatedDeterministicFieldsMatch !== null ||
      value.approvals.length !== 0
    ) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        'Pending pilot-stage attestation cannot contain activation, evidence or approval values.'
      );
    }
    return;
  }
  if (reviewed === null || expiry === null || !pilot.activatedAt) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Active pilot-stage governance requires activation, review and expiry timestamps.'
    );
  }
  const activated = parseTimestamp(pilot.activatedAt, 'pilotStageCompensatingControl.activatedAt');
  if (activated < created || activated !== reviewed || activated >= expiry) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Pilot-stage activation must equal the reviewed timestamp and precede expiry.'
    );
  }
  if (
    pilot.captures.length !== 2 ||
    pilot.repeatedDeterministicFieldsMatch !== true
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Pilot-stage activation requires two matching captures.'
    );
  }
  const [first, second] = pilot.captures;
  for (const [index, capture] of pilot.captures.entries()) {
    requireExactString(capture.artifactReference, `pilot capture ${index + 1} artifactReference`);
    requireExactString(capture.repositoryRevision, `pilot capture ${index + 1} repositoryRevision`);
    requireExactString(capture.changeId, `pilot capture ${index + 1} changeId`);
    requireExactString(capture.connectedDatabaseName, `pilot capture ${index + 1} connectedDatabaseName`);
    requireExactString(capture.restorePointReference, `pilot capture ${index + 1} restorePointReference`);
    if (
      !sha256Pattern.test(capture.artifactSha256) ||
      !sha256Pattern.test(capture.deterministicEvidenceDigest) ||
      !sha256Pattern.test(capture.schemaFingerprint) ||
      !/^[a-f0-9]{40}$/.test(capture.repositoryRevision) ||
      capture.databaseFingerprint !== value.approvedDatabaseFingerprint ||
      capture.operator !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
      capture.namedAssertionsVersion !== value.schema.namedAssertionsVersion
    ) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        `Pilot capture ${index + 1} has incomplete deterministic evidence.`
      );
    }
  }
  const fieldsThatMustMatch: Array<keyof PilotStageCaptureEvidence> = [
    'deterministicEvidenceDigest',
    'repositoryRevision',
    'changeId',
    'databaseFingerprint',
    'connectedDatabaseName',
    'operator',
    'restorePointReference',
    'schemaFingerprint',
    'namedAssertionsVersion'
  ];
  if (fieldsThatMustMatch.some((field) => first[field] !== second[field])) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Pilot-stage capture deterministic fields must match exactly.'
    );
  }
  if (first.artifactReference === second.artifactReference) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Pilot-stage captures require two distinct external artifact references.'
    );
  }
  if (
    value.approvals.length !== 1 ||
    value.approvals[0].role !== 'PRODUCTION_OWNER' ||
    value.approvals[0].reviewer !== PILOT_STAGE_ACCOUNTABLE_PERSON
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Pilot-stage activation requires Patrick McKenna as the sole human Production owner approval.'
    );
  }
  validateApproval(value.approvals[0], 'PRODUCTION_OWNER', value, created, reviewed);
}

function validateRecord(record: AttestedMigrationRecord, label: string, active: boolean) {
  requireExactString(record.migrationName, `${label}.migrationName`);
  if (active && (!record.id || !uuidPattern.test(record.id))) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label}.id must be an exact UUID.`);
  }
  if (!sha256Pattern.test(record.checksum)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label}.checksum must be SHA-256.`);
  }
  requireCanonicalMigrationTimestamp(record.startedAt, `${label}.startedAt`);
  if (record.finishedAt !== null) {
    requireCanonicalMigrationTimestamp(record.finishedAt, `${label}.finishedAt`);
  }
  if (!Number.isInteger(record.appliedStepsCount) || record.appliedStepsCount < 0) {
    throw new AttestationValidationError('ATTESTATION_INVALID', `${label}.appliedStepsCount is invalid.`);
  }
  if (record.rolledBackAt !== null) {
    requireCanonicalMigrationTimestamp(record.rolledBackAt, `${label}.rolledBackAt`);
  }
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

function validateHistoricalResolvedMigration(
  historical: AttestedHistoricalResolvedMigration,
  value: LineageAttestation,
  active: boolean
) {
  const {
    exactLedgerTimestamps,
    observedCurrentSchema,
    r14Evidence,
    ...knownFields
  } = historical;
  if (
    canonicalJson(knownFields) !== canonicalJson(PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS)
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Historical resolved migration known fields must be exact.'
    );
  }
  if (
    historical.environment !== value.environment ||
    historical.productionDatabaseFingerprint !== value.approvedDatabaseFingerprint ||
    historical.approvedManifestHash !== value.approvedManifestHash
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Historical resolved migration repository and Production scope is invalid.'
    );
  }
  if (
    !value.evidenceReferences.includes(historical.checksumEvidenceReference) ||
    !value.evidenceReferences.includes(historical.lifecycleEvidenceReference) ||
    !value.evidenceReferences.includes(historical.expectedSchemaInventoryReference)
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Historical resolved migration repository evidence is not indexed.'
    );
  }
  if (
    observedCurrentSchema.fingerprintVersion !== 'clada-postgres-schema-fingerprint/v2' ||
    observedCurrentSchema.catalogAssertionsVersion !==
      HISTORICAL_RESOLVED_CATALOG_ASSERTIONS_VERSION
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Historical resolved migration schema evidence version is invalid.'
    );
  }

  if (!active) {
    if (
      exactLedgerTimestamps.startedAt !== null ||
      exactLedgerTimestamps.finishedAt !== null ||
      observedCurrentSchema.fingerprint !== null ||
      observedCurrentSchema.catalogAssertionsDigest !== null ||
      observedCurrentSchema.evidenceReference !== null ||
      observedCurrentSchema.evidenceSha256 !== null ||
      r14Evidence.changeId !== null ||
      r14Evidence.repositoryRevision !== null ||
      r14Evidence.captureArtifactReferences.length !== 0 ||
      r14Evidence.captureArtifactSha256s.length !== 0 ||
      r14Evidence.recoveryEvidenceReference !== null
    ) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        'Pending historical resolved migration cannot contain uncaptured R14 values.'
      );
    }
    return;
  }

  const startedAt = requireCanonicalMigrationTimestamp(
    exactLedgerTimestamps.startedAt,
    'historicalResolvedMigration.exactLedgerTimestamps.startedAt'
  );
  const finishedAt = requireCanonicalMigrationTimestamp(
    exactLedgerTimestamps.finishedAt,
    'historicalResolvedMigration.exactLedgerTimestamps.finishedAt'
  );
  if (Date.parse(finishedAt) < Date.parse(startedAt)) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Historical resolved migration finish timestamp precedes its start.'
    );
  }
  if (
    !observedCurrentSchema.fingerprint ||
    !sha256Pattern.test(observedCurrentSchema.fingerprint) ||
    !observedCurrentSchema.catalogAssertionsDigest ||
    !sha256Pattern.test(observedCurrentSchema.catalogAssertionsDigest) ||
    !observedCurrentSchema.evidenceReference ||
    !observedCurrentSchema.evidenceSha256 ||
    !sha256Pattern.test(observedCurrentSchema.evidenceSha256)
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Active historical resolved migration requires exact current schema evidence.'
    );
  }
  requireExactString(
    observedCurrentSchema.evidenceReference,
    'historicalResolvedMigration.observedCurrentSchema.evidenceReference'
  );
  if (
    !r14Evidence.changeId ||
    !r14Evidence.repositoryRevision ||
    !/^[a-f0-9]{40}$/.test(r14Evidence.repositoryRevision) ||
    !r14Evidence.recoveryEvidenceReference ||
    r14Evidence.captureArtifactReferences.length !== 2 ||
    r14Evidence.captureArtifactSha256s.length !== 2 ||
    r14Evidence.captureArtifactSha256s.some((digest) => !sha256Pattern.test(digest))
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Active historical resolved migration requires complete R14 capture and recovery evidence.'
    );
  }
  requireExactString(r14Evidence.changeId, 'historicalResolvedMigration.r14Evidence.changeId');
  requireExactString(
    r14Evidence.recoveryEvidenceReference,
    'historicalResolvedMigration.r14Evidence.recoveryEvidenceReference'
  );
  r14Evidence.captureArtifactReferences.forEach((reference, index) =>
    requireExactString(reference, `historicalResolvedMigration.r14Evidence.captureArtifactReferences[${index}]`)
  );
  if (
    new Set(r14Evidence.captureArtifactReferences).size !== 2 ||
    !r14Evidence.captureArtifactReferences.includes(observedCurrentSchema.evidenceReference) ||
    r14Evidence.captureArtifactSha256s[
      r14Evidence.captureArtifactReferences.indexOf(observedCurrentSchema.evidenceReference)
    ] !== observedCurrentSchema.evidenceSha256 ||
    value.schema.preMigrationFingerprint !== observedCurrentSchema.fingerprint
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Historical resolved migration current schema evidence is not bound to R14.'
    );
  }

  if (value.governanceMode === 'pilot-stage-compensating-control') {
    const captures = value.pilotStageCompensatingControl?.captures ?? [];
    if (
      captures.length !== 2 ||
      canonicalJson(r14Evidence.captureArtifactReferences) !==
        canonicalJson(captures.map((capture) => capture.artifactReference)) ||
      canonicalJson(r14Evidence.captureArtifactSha256s) !==
        canonicalJson(captures.map((capture) => capture.artifactSha256)) ||
      captures.some(
        (capture) =>
          capture.changeId !== r14Evidence.changeId ||
          capture.repositoryRevision !== r14Evidence.repositoryRevision ||
          capture.restorePointReference !== r14Evidence.recoveryEvidenceReference ||
          capture.schemaFingerprint !== observedCurrentSchema.fingerprint
      )
    ) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        'Historical resolved migration evidence must match both pilot-stage R14 captures.'
      );
    }
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
    value.verifierImplementationVersion !== 'adr-0024-lineage-verifier/v2' ||
    value.manifestVersion !== 'clada-migration-manifest/v1' ||
    value.schema.fingerprintVersion !== 'clada-postgres-schema-fingerprint/v2' ||
    value.schema.namedAssertionsVersion !== 'adr-0024-catalog-assertions/v2'
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
  if (
    canonicalJson(value.repositoryMigrationChecksumDivergences) !==
    canonicalJson(PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES)
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Production repository checksum divergence evidence must be exact.'
    );
  }
  if (
    value.repositoryMigrationChecksumDivergences.some(
      (divergence) =>
        !value.evidenceReferences.includes(divergence.checksumEvidenceReference) ||
        !sha256Pattern.test(divergence.checksumEvidenceSha256) ||
        divergence.productionDatabaseFingerprint !== value.approvedDatabaseFingerprint ||
        divergence.approvedManifestHash !== value.approvedManifestHash
    )
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Production repository checksum divergence scope is invalid.'
    );
  }

  const active = value.status === 'active';
  if (value.historicalResolvedMigrations.length !== 1) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Exactly one historical resolved migration entry is required.'
    );
  }
  validateHistoricalResolvedMigration(value.historicalResolvedMigrations[0], value, active);
  validateRecord(value.missingMigration, 'missingMigration', active);
  validateRecord(value.relatedMigration.failedRecord, 'relatedMigration.failedRecord', active);
  validateRecord(value.relatedMigration.completedZeroStepRecord, 'relatedMigration.completedZeroStepRecord', active);
  requirePinnedRecord(
    value.missingMigration,
    {
      migrationName: '20260423093000_application_pack_admin_fields',
      checksum: 'affbde51faf1b8ccc731f575326d8dfdf2c21ec625565f516d5350ec5779f589',
      startedAt: '2026-04-23T07:04:10.39554Z',
      finishedAt: '2026-04-23T07:04:10.527739Z',
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
      startedAt: '2026-04-29T06:01:05.497406Z',
      finishedAt: null,
      appliedStepsCount: 0,
      rolledBackAt: '2026-04-29T06:01:38.423504Z',
      logsState: 'sha256'
    },
    'Related failed record'
  );
  requirePinnedRecord(
    value.relatedMigration.completedZeroStepRecord,
    {
      migrationName: '20260428120000_manual_submission_prep',
      checksum: '42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3',
      startedAt: '2026-04-29T06:01:38.54346Z',
      finishedAt: '2026-04-29T06:01:38.54346Z',
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
  const expiry = value.expiresAt === null ? null : parseTimestamp(value.expiresAt, 'expiresAt');
  if (
    active &&
    (expiry === null || expiry <= created || expiry - created > 90 * 24 * 60 * 60 * 1000)
  ) {
    throw new AttestationValidationError(
      'ATTESTATION_INVALID',
      'Active attestation expiry must be within 90 days.'
    );
  }
  if (!['standard-independent-human', 'pilot-stage-compensating-control'].includes(value.governanceMode)) {
    throw new AttestationValidationError('ATTESTATION_INVALID', 'Unsupported governance mode.');
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
    const reviewed = parseTimestamp(value.reviewedAt, 'reviewedAt');
    if (reviewed < created || reviewed > expiry!) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        'Review timestamp must fall within the attestation lifecycle.'
      );
    }
  }
  const reviewed = value.reviewedAt === null ? null : parseTimestamp(value.reviewedAt, 'reviewedAt');
  if (value.governanceMode === 'standard-independent-human') {
    if (value.pilotStageCompensatingControl !== null) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        'Standard governance cannot include pilot-stage compensating controls.'
      );
    }
    const approvals = new Map(value.approvals.map((approval) => [approval.role, approval]));
    if (
      value.approvals.length !== REQUIRED_APPROVAL_ROLES.length ||
      approvals.size !== REQUIRED_APPROVAL_ROLES.length
    ) {
      throw new AttestationValidationError('ATTESTATION_INVALID', 'Approval roles must be unique and exact.');
    }
    for (const role of REQUIRED_APPROVAL_ROLES) {
      const approval = approvals.get(role);
      if (!approval) throw new AttestationValidationError('ATTESTATION_INVALID', `Missing ${role} approval.`);
      if (active) validateApproval(approval, role, value, created, reviewed!);
    }
    if (
      active &&
      approvals.get('DATABASE_RELIABILITY_REVIEWER')!.reviewer!.toLocaleLowerCase() ===
        approvals.get('PRODUCTION_OWNER')!.reviewer!.toLocaleLowerCase()
    ) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        'Database reliability reviewer must be independent from the Production owner.'
      );
    }
  } else {
    validatePilotStageGovernance(value, active, created, reviewed, expiry);
  }

  if (options.requireActive) {
    if (!active) throw new AttestationValidationError('ATTESTATION_INACTIVE', `Attestation is ${value.status}.`);
    if ((options.now ?? new Date()).getTime() >= expiry!) {
      throw new AttestationValidationError('ATTESTATION_EXPIRED', 'Attestation has expired.');
    }
  }
  return value;
}
