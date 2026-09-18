import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json';
import {
  ATTESTATION_ID,
  ATTESTATION_VERSION,
  PILOT_STAGE_ACCOUNTABLE_PERSON,
  PILOT_STAGE_LATER_REVIEW_TRIGGER,
  validateLineageAttestation,
  type LineageAttestation
} from './lineage-attestation';

const gitRevisionPattern = /^[a-f0-9]{40}$/;
const wildcardPattern = /[*?]|\.\*/;
const repositoryMarkdownPattern = /^docs\/[A-Za-z0-9_./-]+\.md$/;
const prohibitedReviewerPattern =
  /^(?:unknown|tbd|todo|placeholder|reviewer(?:-\d+)?|ai|artificial intelligence|codex|chatgpt|openai|claude|gemini|copilot)$/i;

export const POST_MIGRATION_ATTESTATION_VERSION =
  'clada-adr-0024-post-migration-attestation/v7' as const;
export const POST_MIGRATION_ATTESTATION_ID =
  'ADR-0024-PRODUCTION-POST-MIGRATION-2026-08-27' as const;
export const POST_MIGRATION_APPROVAL_PACKAGE_VERSION =
  'clada-adr-0024-post-migration-approval-package/v1' as const;
export const POST_MIGRATION_ACKNOWLEDGEMENT_VERSION =
  'clada-adr-0024-post-migration-acknowledgement/v1' as const;
export const POST_MIGRATION_REVIEWER_ROLE = 'DATABASE_RELIABILITY_REVIEWER' as const;
export const POST_MIGRATION_SOURCE_ATTESTATION_SHA256 =
  '725cddb6ee9f263970ea5dff17da44a966904a97f071ee914872dab366189725' as const;
export const POST_MIGRATION_SOURCE_ATTESTATION_CANONICAL_SHA256 =
  '87f8652b0b63f06a5751e579c120bfa42389a227978ded5b60d27be435b72357' as const;
export const POST_MIGRATION_EVIDENCE_COMPLETED_AT = '2026-08-27T09:40:39.660Z' as const;
export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_VERSION =
  'clada-adr-0024-executive-risk-acceptance/v1' as const;
export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_ID =
  'ADR-0024-EXECUTIVE-RISK-ACCEPTANCE-2026-09-18' as const;
export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_RECORDED_AT =
  '2026-09-18T10:34:34.572Z' as const;
export const POST_MIGRATION_V7_ARTIFACT_SHA256 =
  '9767c7c434976de0291bb77eafefa0cedd78ab0b24f99b57240c4da9e6faf0ee' as const;
export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_STARTING_REVISION =
  'd9a19612ecf373b68325c344ef2c72d34b1e0260' as const;

export const POST_MIGRATION_SOURCE_ATTESTATION = {
  version: ATTESTATION_VERSION,
  attestationId: ATTESTATION_ID,
  status: 'retired',
  artifactReference: 'prisma/lineage-attestations/adr-0024-production.json',
  artifactSha256: POST_MIGRATION_SOURCE_ATTESTATION_SHA256,
  historicalEvidenceChangeId: 'CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19',
  retainedHistoricalCaptureCount: 2,
  retainedHistoricalApprovalCount: 1
} as const;

export const POST_MIGRATION_EVIDENCE_BUNDLE = {
  changeId: 'CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2',
  evidenceVersion: 'adr-0024-production-post-migration-evidence/v1',
  environment: 'production',
  databaseFingerprint: 'db_4e1d3bd23cff6801',
  postMigrationFingerprint: '22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989',
  evidenceRepositoryRevision: '6eb3ab4bf1763883443793dc46a7be30e8a2e6c0',
  manifestHash: '1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872',
  captures: [
    {
      ordinal: 1,
      artifactReference:
        'ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/capture-1.json',
      artifactSha256: 'f59fd81139d9a3a83954babc50b861742a6dd27d5d697dde5c318a1ea74c5866',
      capturedAt: '2026-08-27T09:40:36.895Z'
    },
    {
      ordinal: 2,
      artifactReference:
        'ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/capture-2.json',
      artifactSha256: 'a5ca135428fffb4c8266268b928fad0e5225d9c3239096135dbd542c0f1cbf44',
      capturedAt: POST_MIGRATION_EVIDENCE_COMPLETED_AT
    }
  ],
  deterministicEvidenceDigest:
    '89e0ef66a07f3390b83c378e323eca699cc71012b66ea601889eb5dc1a100a8b',
  operationBoundary: {
    artifactReference:
      'ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/operation-boundary.json',
    artifactSha256: 'd6c99565d205d61de619380f4c977bb36796d312243f0410812e0ad25d433227'
  },
  migrationState: {
    repositoryMigrations: 16,
    appliedRepositoryMigrations: 16,
    pendingRepositoryMigrations: 0
  },
  passwordResetMigration: {
    migrationName: '20260724180000_password_reset_foundation',
    recordId: '25b79ca5-b247-4738-9dfb-ada810e3a386',
    checksum: 'cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7',
    startedAt: '2026-08-26T10:25:56.022508Z',
    finishedAt: '2026-08-26T10:25:56.536774Z',
    rolledBackAt: null,
    appliedStepsCount: 1,
    logsState: 'none',
    logsDigest: null
  },
  historicalLineage: {
    ordinaryChecksumTupleCount: 7,
    ordinaryChecksumTuplesVerified: true,
    pilotAuthHistoricalResolvedMigrationVerified: true
  },
  catalog: {
    fingerprintVersion: 'clada-postgres-schema-fingerprint/v2',
    namedAssertionsVersion: 'adr-0024-catalog-assertions/v2',
    assertionsVerified: true,
    unsupportedRelations: 0
  }
} as const;

export const POST_MIGRATION_ACKNOWLEDGEMENT_STATEMENTS = [
  'The controlled Production reconciliation applied 20260724180000_password_reset_foundation.',
  'Post-migration R2 evidence verified 16 of 16 repository migrations applied and zero pending.',
  'The approved Production post-migration schema fingerprint is 22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989.',
  'Both R2 read-only Production captures matched deterministically.',
  'All seven ordinary historical checksum-divergence tuples and the pilot-auth historical resolved migration remain verified.',
  'No manual SQL or prisma migrate resolve was used for the Production reconciliation.',
  'No Production application deployment was performed as part of the database reconciliation or R2 evidence operation.',
  'Later qualified-human review remains required before the first 10 pilot installers or when another engineer or qualified external database reviewer joins, whichever occurs first.'
] as const;

export const POST_MIGRATION_LATER_REVIEW = {
  required: true,
  trigger: PILOT_STAGE_LATER_REVIEW_TRIGGER,
  timingRule: 'before-expiry-and-trigger-whichever-occurs-first'
} as const;

export const POST_MIGRATION_REQUIRED_EVIDENCE_REFERENCES = [
  'prisma/lineage-attestations/adr-0024-production.json',
  'docs/03-engineering/PR_45_ADR_0024_POST_MIGRATION_GOVERNANCE_REVIEW.md',
  'docs/03-engineering/evidence/ADR_0024_POST_MIGRATION_GOVERNANCE_REVIEW.json',
  'docs/03-engineering/PR_45_ADR_0024_POST_MIGRATION_GOVERNANCE_MODEL_REPAIR.md',
  'docs/03-engineering/evidence/ADR_0024_POST_MIGRATION_APPROVAL_PACKAGE_V7.json'
] as const;

export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_BINDING = {
  adrId: 'ADR-0024',
  pullRequest: 45,
  incidentId: 'INCIDENT-2026-07-25-PRODUCTION-MIGRATION-HISTORY-DRIFT',
  authorisedStartingRevision: POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_STARTING_REVISION,
  postMigrationAttestation: {
    version: POST_MIGRATION_ATTESTATION_VERSION,
    attestationId: POST_MIGRATION_ATTESTATION_ID,
    artifactReference:
      'prisma/lineage-attestations/adr-0024-production-post-migration-v7.json',
    artifactSha256: POST_MIGRATION_V7_ARTIFACT_SHA256,
    status: 'pending-approval',
    qualifyingApprovalCount: 0
  },
  productionIdentity: {
    environment: 'production',
    database: 'neondb',
    branch: 'br-cool-wave-abysq3lu',
    databaseFingerprint: POST_MIGRATION_EVIDENCE_BUNDLE.databaseFingerprint
  },
  r2Evidence: {
    changeId: POST_MIGRATION_EVIDENCE_BUNDLE.changeId,
    evidenceVersion: POST_MIGRATION_EVIDENCE_BUNDLE.evidenceVersion,
    repositoryMigrations: POST_MIGRATION_EVIDENCE_BUNDLE.migrationState.repositoryMigrations,
    appliedRepositoryMigrations:
      POST_MIGRATION_EVIDENCE_BUNDLE.migrationState.appliedRepositoryMigrations,
    pendingRepositoryMigrations:
      POST_MIGRATION_EVIDENCE_BUNDLE.migrationState.pendingRepositoryMigrations,
    postMigrationFingerprint: POST_MIGRATION_EVIDENCE_BUNDLE.postMigrationFingerprint,
    capture1Sha256: POST_MIGRATION_EVIDENCE_BUNDLE.captures[0].artifactSha256,
    capture2Sha256: POST_MIGRATION_EVIDENCE_BUNDLE.captures[1].artifactSha256,
    deterministicEvidenceDigest: POST_MIGRATION_EVIDENCE_BUNDLE.deterministicEvidenceDigest,
    operationBoundarySha256: POST_MIGRATION_EVIDENCE_BUNDLE.operationBoundary.artifactSha256,
    passwordResetMigration: {
      migrationName: POST_MIGRATION_EVIDENCE_BUNDLE.passwordResetMigration.migrationName,
      recordId: POST_MIGRATION_EVIDENCE_BUNDLE.passwordResetMigration.recordId,
      checksum: POST_MIGRATION_EVIDENCE_BUNDLE.passwordResetMigration.checksum,
      recordCount: 1,
      lifecycle: 'exact-canonical-one-step-success'
    },
    catalogAssertionsVerified: POST_MIGRATION_EVIDENCE_BUNDLE.catalog.assertionsVerified,
    historicalLineageVerified:
      POST_MIGRATION_EVIDENCE_BUNDLE.historicalLineage.ordinaryChecksumTuplesVerified &&
      POST_MIGRATION_EVIDENCE_BUNDLE.historicalLineage
        .pilotAuthHistoricalResolvedMigrationVerified
  }
} as const;

export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_REVIEW_STATE = {
  requiredByOriginalV7Contract: true,
  satisfied: false,
  qualifyingApprovalCount: 0,
  peterArcherCountedAsApproval: false,
  peterArcherStatementClassification: 'human-review-not-reliable-for-governance-purposes'
} as const;

export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_DECISION = {
  residualGovernanceRiskAccepted: true,
  v7ActivationRequirementSupersededForThisIncidentOnly: true,
  technicalClosureAuthorised: true,
  normalDevelopmentAuthorisedAfterValidation: true,
  reusableForAnotherIncident: false
} as const;

export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_ACKNOWLEDGEMENTS = [
  'V7 did not obtain the independent qualified-human DATABASE_RELIABILITY_REVIEWER approval required by its original activation contract.',
  "Peter Archer's limited review does not satisfy the v7 qualified-human approval contract and is not counted as an approval.",
  'R2 verified the intended Production identity, 16 of 16 repository migrations applied and zero pending migrations.',
  'R2 verified one canonical successful Production record for 20260724180000_password_reset_foundation.',
  'R2 produced two deterministic read-only Production captures and the actual Production post-migration schema fingerprint.',
  'R2 verified the required post-migration catalog assertions and preserved historical lineage assertions.',
  'Patrick McKenna, acting as CEO and Production Owner, accepts the residual governance risk of closing ADR-0024 without activating v7 through its original independent-review path.',
  'The pending v7 activation requirement is superseded only for this ADR-0024 incident, PR #45, the exact R2 evidence and the password-reset Production migration incident.',
  'This decision does not alter the R2 evidence, migration history, schema fingerprint, checksums or historical attestations.'
] as const;

export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_PROHIBITIONS = [
  'production-migration',
  'manual-sql',
  'prisma-migrate-resolve',
  'prisma-db-push',
  'production-write',
  'deployment',
  'alias-movement',
  'future-incident-reuse'
] as const;

export const POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_EVIDENCE_REFERENCES = [
  'prisma/lineage-attestations/adr-0024-production-post-migration-v7.json',
  'docs/03-engineering/PR_45_ADR_0024_R4_POST_MIGRATION_SCHEMA_FINGERPRINT_INVESTIGATION.md',
  'docs/03-engineering/PR_45_ADR_0024_POST_MIGRATION_PRODUCTION_VERIFICATION_R2.md',
  'docs/03-engineering/PR_45_ADR_0024_POST_MIGRATION_GOVERNANCE_MODEL_REPAIR.md',
  'docs/03-engineering/ADR_0024_PRODUCTION_MIGRATION_INCIDENT_EXECUTIVE_RISK_ACCEPTANCE_AND_CLOSURE.md'
] as const;

export type PostMigrationTechnicalQualification = {
  basis: 'declared-relevant-postgresql-migration-reliability-experience';
  databaseMigrationExperience: true;
  postgresqlReliabilityExperience: true;
  adr0024EvidenceReviewCompleted: true;
  experienceDeclaration: string;
  evidenceReference: string;
  acknowledgedAt: string;
};

export const POST_MIGRATION_PENDING_TECHNICAL_QUALIFICATION = {
  basis: 'declared-relevant-postgresql-migration-reliability-experience',
  databaseMigrationExperience: null,
  postgresqlReliabilityExperience: null,
  adr0024EvidenceReviewCompleted: null,
  experienceDeclaration: null,
  evidenceReference: null,
  acknowledgedAt: null
} as const;

export type PendingPostMigrationTechnicalQualification = {
  basis: 'declared-relevant-postgresql-migration-reliability-experience';
  databaseMigrationExperience: null;
  postgresqlReliabilityExperience: null;
  adr0024EvidenceReviewCompleted: null;
  experienceDeclaration: null;
  evidenceReference: null;
  acknowledgedAt: null;
};

export type PostMigrationSourceAttestation = {
  version: string;
  attestationId: string;
  status: string;
  artifactReference: string;
  artifactSha256: string;
  historicalEvidenceChangeId: string;
  retainedHistoricalCaptureCount: number;
  retainedHistoricalApprovalCount: number;
};

export type PostMigrationEvidenceBundle = {
  changeId: string;
  evidenceVersion: string;
  environment: string;
  databaseFingerprint: string;
  postMigrationFingerprint: string;
  evidenceRepositoryRevision: string;
  manifestHash: string;
  captures: Array<{
    ordinal: number;
    artifactReference: string;
    artifactSha256: string;
    capturedAt: string;
  }>;
  deterministicEvidenceDigest: string;
  operationBoundary: {
    artifactReference: string;
    artifactSha256: string;
  };
  migrationState: {
    repositoryMigrations: number;
    appliedRepositoryMigrations: number;
    pendingRepositoryMigrations: number;
  };
  passwordResetMigration: {
    migrationName: string;
    recordId: string;
    checksum: string;
    startedAt: string;
    finishedAt: string;
    rolledBackAt: string | null;
    appliedStepsCount: number;
    logsState: string;
    logsDigest: string | null;
  };
  historicalLineage: {
    ordinaryChecksumTupleCount: number;
    ordinaryChecksumTuplesVerified: boolean;
    pilotAuthHistoricalResolvedMigrationVerified: boolean;
  };
  catalog: {
    fingerprintVersion: string;
    namedAssertionsVersion: string;
    assertionsVerified: boolean;
    unsupportedRelations: number;
  };
};

export type PostMigrationApproval = {
  status: 'pending' | 'approved';
  reviewerName: string | null;
  reviewerRole: string;
  productionOwner: string;
  independentFromProductionOwner: true | null;
  technicalQualification:
    | PendingPostMigrationTechnicalQualification
    | PostMigrationTechnicalQualification
    | null;
  evidenceReference: string | null;
  approvedAt: string | null;
  binding: {
    changeId: string;
    productionFingerprint: string;
    capture1Sha256: string;
    capture2Sha256: string;
    deterministicEvidenceDigest: string;
    evidenceRepositoryRevision: string;
    governanceRepositoryRevision: string | null;
    attestationVersion: string;
    acknowledgementVersion: string;
  };
  acknowledgement: {
    version: string;
    statements: string[];
    accepted: true | null;
  };
};

export type PostMigrationLineageAttestation = {
  version: string;
  attestationId: string;
  status: 'pending-approval' | 'active' | 'withdrawn' | 'retired';
  sourceAttestation: PostMigrationSourceAttestation;
  createdAt: string;
  reviewedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  reason: string;
  evidenceReferences: string[];
  evidence: PostMigrationEvidenceBundle;
  approval: PostMigrationApproval;
  laterQualifiedHumanReview: {
    required: boolean;
    trigger: string;
    timingRule: string;
  };
};

export type PostMigrationApprovalPackage = {
  version: string;
  status: 'awaiting-qualified-human' | 'approved';
  attestationVersion: string;
  attestationTemplateReference: string;
  sourceAttestation: PostMigrationSourceAttestation;
  evidence: PostMigrationEvidenceBundle;
  reviewerTemplate: PostMigrationApproval;
  nextAction: string;
};

export type PostMigrationExecutiveRiskAcceptance = {
  version: string;
  decisionId: string;
  status: 'accepted-and-closed';
  recordedAt: string;
  decisionMaker: {
    name: string;
    roles: string[];
  };
  binding: {
    adrId: string;
    pullRequest: number;
    incidentId: string;
    authorisedStartingRevision: string;
    postMigrationAttestation: {
      version: string;
      attestationId: string;
      artifactReference: string;
      artifactSha256: string;
      status: string;
      qualifyingApprovalCount: number;
    };
    productionIdentity: {
      environment: string;
      database: string;
      branch: string;
      databaseFingerprint: string;
    };
    r2Evidence: {
      changeId: string;
      evidenceVersion: string;
      repositoryMigrations: number;
      appliedRepositoryMigrations: number;
      pendingRepositoryMigrations: number;
      postMigrationFingerprint: string;
      capture1Sha256: string;
      capture2Sha256: string;
      deterministicEvidenceDigest: string;
      operationBoundarySha256: string;
      passwordResetMigration: {
        migrationName: string;
        recordId: string;
        checksum: string;
        recordCount: number;
        lifecycle: string;
      };
      catalogAssertionsVerified: boolean;
      historicalLineageVerified: boolean;
    };
  };
  independentReview: {
    requiredByOriginalV7Contract: boolean;
    satisfied: boolean;
    qualifyingApprovalCount: number;
    peterArcherCountedAsApproval: boolean;
    peterArcherStatementClassification: string;
  };
  decision: {
    residualGovernanceRiskAccepted: boolean;
    v7ActivationRequirementSupersededForThisIncidentOnly: boolean;
    technicalClosureAuthorised: boolean;
    normalDevelopmentAuthorisedAfterValidation: boolean;
    reusableForAnotherIncident: boolean;
  };
  acknowledgements: string[];
  prohibitions: string[];
  evidenceReferences: string[];
};

export class PostMigrationAttestationValidationError extends Error {
  constructor(
    public readonly code:
      | 'POST_MIGRATION_ATTESTATION_INACTIVE'
      | 'POST_MIGRATION_ATTESTATION_EXPIRED'
      | 'POST_MIGRATION_ATTESTATION_INVALID',
    message: string
  ) {
    super(message);
    this.name = 'PostMigrationAttestationValidationError';
  }
}

function invalid(message: string): never {
  throw new PostMigrationAttestationValidationError('POST_MIGRATION_ATTESTATION_INVALID', message);
}

function exactString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim() || wildcardPattern.test(value)) {
    invalid(`${label} must be an exact non-wildcard string.`);
  }
  return value;
}

function humanName(value: unknown, label: string) {
  const exact = exactString(value, label);
  if (prohibitedReviewerPattern.test(exact)) invalid(`${label} must identify a real qualified human.`);
  return exact;
}

function timestamp(value: unknown, label: string) {
  const exact = exactString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(exact)) {
    invalid(`${label} must be an exact UTC millisecond timestamp.`);
  }
  const parsed = Date.parse(exact);
  if (!Number.isFinite(parsed)) invalid(`${label} is invalid.`);
  return parsed;
}

function repositoryMarkdown(value: unknown, label: string) {
  const exact = exactString(value, label);
  if (!repositoryMarkdownPattern.test(exact) || exact.split('/').includes('..')) {
    invalid(`${label} must be a repository Markdown evidence path.`);
  }
  return exact;
}

function expectedApprovalBinding(governanceRepositoryRevision: string | null) {
  return {
    changeId: POST_MIGRATION_EVIDENCE_BUNDLE.changeId,
    productionFingerprint: POST_MIGRATION_EVIDENCE_BUNDLE.postMigrationFingerprint,
    capture1Sha256: POST_MIGRATION_EVIDENCE_BUNDLE.captures[0].artifactSha256,
    capture2Sha256: POST_MIGRATION_EVIDENCE_BUNDLE.captures[1].artifactSha256,
    deterministicEvidenceDigest: POST_MIGRATION_EVIDENCE_BUNDLE.deterministicEvidenceDigest,
    evidenceRepositoryRevision: POST_MIGRATION_EVIDENCE_BUNDLE.evidenceRepositoryRevision,
    governanceRepositoryRevision,
    attestationVersion: POST_MIGRATION_ATTESTATION_VERSION,
    acknowledgementVersion: POST_MIGRATION_ACKNOWLEDGEMENT_VERSION
  };
}

function validatePendingApproval(approval: PostMigrationApproval) {
  if (
    approval.status !== 'pending' ||
    approval.reviewerName !== null ||
    approval.reviewerRole !== POST_MIGRATION_REVIEWER_ROLE ||
    approval.productionOwner !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
    approval.independentFromProductionOwner !== null ||
    canonicalJson(approval.technicalQualification) !==
      canonicalJson(POST_MIGRATION_PENDING_TECHNICAL_QUALIFICATION) ||
    approval.evidenceReference !== null ||
    approval.approvedAt !== null ||
    approval.acknowledgement.accepted !== null ||
    canonicalJson(approval.binding) !== canonicalJson(expectedApprovalBinding(null))
  ) {
    invalid('Pending post-migration approval must retain exact empty human fields and evidence binding.');
  }
}

function validateApprovedApproval(
  value: PostMigrationLineageAttestation,
  created: number,
  reviewed: number
) {
  const approval = value.approval;
  if (
    approval.status !== 'approved' ||
    !approval.reviewerName ||
    !approval.approvedAt ||
    !approval.evidenceReference ||
    approval.reviewerRole !== POST_MIGRATION_REVIEWER_ROLE ||
    approval.productionOwner !== PILOT_STAGE_ACCOUNTABLE_PERSON ||
    approval.independentFromProductionOwner !== true ||
    !approval.technicalQualification ||
    approval.acknowledgement.accepted !== true
  ) {
    invalid('Active post-migration attestation requires one complete qualified-human approval.');
  }
  const reviewer = humanName(approval.reviewerName, 'approval.reviewerName');
  if (reviewer.toLocaleLowerCase() === PILOT_STAGE_ACCOUNTABLE_PERSON.toLocaleLowerCase()) {
    invalid('Database reliability reviewer must be independent from the Production owner.');
  }
  const approved = timestamp(approval.approvedAt, 'approval.approvedAt');
  const approvalReference = repositoryMarkdown(
    approval.evidenceReference,
    'approval.evidenceReference'
  );
  const qualification = approval.technicalQualification;
  if (
    qualification.basis !== 'declared-relevant-postgresql-migration-reliability-experience' ||
    qualification.databaseMigrationExperience !== true ||
    qualification.postgresqlReliabilityExperience !== true ||
    qualification.adr0024EvidenceReviewCompleted !== true
  ) {
    invalid('Reviewer technical qualification declaration is incomplete.');
  }
  const experience = exactString(
    qualification.experienceDeclaration,
    'approval.technicalQualification.experienceDeclaration'
  );
  if (experience.length < 40) invalid('Reviewer experience declaration is insufficiently specific.');
  const qualificationReference = repositoryMarkdown(
    qualification.evidenceReference,
    'approval.technicalQualification.evidenceReference'
  );
  const qualificationAcknowledged = timestamp(
    qualification.acknowledgedAt,
    'approval.technicalQualification.acknowledgedAt'
  );
  if (
    approved !== reviewed ||
    approved < created ||
    approved <= Date.parse(POST_MIGRATION_EVIDENCE_COMPLETED_AT) ||
    qualificationAcknowledged <= Date.parse(POST_MIGRATION_EVIDENCE_COMPLETED_AT) ||
    qualificationAcknowledged > approved
  ) {
    invalid('Approval, qualification, evidence completion and review timestamps are not ordered.');
  }
  if (
    !gitRevisionPattern.test(approval.binding.governanceRepositoryRevision ?? '') ||
    canonicalJson(approval.binding) !==
      canonicalJson(expectedApprovalBinding(approval.binding.governanceRepositoryRevision))
  ) {
    invalid('Qualified-human approval is not bound to the exact R2 evidence and governance revision.');
  }
  for (const reference of [approvalReference, qualificationReference]) {
    if (!value.evidenceReferences.includes(reference)) {
      invalid('Qualified-human approval evidence is not indexed by the v7 attestation.');
    }
  }
}

export function validatePostMigrationLineageAttestation(
  value: PostMigrationLineageAttestation,
  options: { now?: Date; requireActive?: boolean } = {}
) {
  if (
    value.version !== POST_MIGRATION_ATTESTATION_VERSION ||
    value.attestationId !== POST_MIGRATION_ATTESTATION_ID
  ) {
    invalid('Unsupported post-migration attestation identity or version.');
  }
  if (!['pending-approval', 'active', 'withdrawn', 'retired'].includes(value.status)) {
    invalid('Unsupported post-migration attestation status.');
  }
  if (canonicalJson(value.sourceAttestation) !== canonicalJson(POST_MIGRATION_SOURCE_ATTESTATION)) {
    invalid('Post-migration source attestation must be the exact retired v6 artifact.');
  }
  if (canonicalJson(value.evidence) !== canonicalJson(POST_MIGRATION_EVIDENCE_BUNDLE)) {
    invalid('Post-migration evidence must be the complete exact atomic R2 bundle.');
  }
  if (
    canonicalJson(value.laterQualifiedHumanReview) !== canonicalJson(POST_MIGRATION_LATER_REVIEW)
  ) {
    invalid('Later qualified-human review controls must remain exact.');
  }
  exactString(value.reason, 'reason');
  const created = timestamp(value.createdAt, 'createdAt');
  if (created <= Date.parse(POST_MIGRATION_EVIDENCE_COMPLETED_AT)) {
    invalid('The v7 attestation must be created after R2 evidence completed.');
  }
  if (!Array.isArray(value.evidenceReferences) || value.evidenceReferences.length === 0) {
    invalid('Post-migration evidence references are required.');
  }
  value.evidenceReferences.forEach((reference, index) =>
    exactString(reference, `evidenceReferences[${index}]`)
  );
  if (new Set(value.evidenceReferences).size !== value.evidenceReferences.length) {
    invalid('Post-migration evidence references must be unique.');
  }
  if (
    POST_MIGRATION_REQUIRED_EVIDENCE_REFERENCES.some(
      (reference) => !value.evidenceReferences.includes(reference)
    )
  ) {
    invalid('Post-migration governance evidence references are incomplete.');
  }
  if (
    value.approval.acknowledgement.version !== POST_MIGRATION_ACKNOWLEDGEMENT_VERSION ||
    canonicalJson(value.approval.acknowledgement.statements) !==
      canonicalJson(POST_MIGRATION_ACKNOWLEDGEMENT_STATEMENTS)
  ) {
    invalid('Post-migration acknowledgement version and statements must be exact.');
  }

  const active = value.status === 'active';
  if (!active) {
    if (value.status !== 'pending-approval') {
      invalid('Only the pending-approval and active v7 lifecycle states are currently supported.');
    }
    if (value.reviewedAt !== null || value.activatedAt !== null || value.expiresAt !== null) {
      invalid('Pending-approval v7 cannot contain review, activation or expiry timestamps.');
    }
    if (
      canonicalJson(value.evidenceReferences) !==
      canonicalJson(POST_MIGRATION_REQUIRED_EVIDENCE_REFERENCES)
    ) {
      invalid('Pending-approval v7 cannot contain unapproved human evidence references.');
    }
    validatePendingApproval(value.approval);
  } else {
    if (!value.reviewedAt || !value.activatedAt || !value.expiresAt) {
      invalid('Active v7 requires review, activation and expiry timestamps.');
    }
    const reviewed = timestamp(value.reviewedAt, 'reviewedAt');
    const activated = timestamp(value.activatedAt, 'activatedAt');
    const expiry = timestamp(value.expiresAt, 'expiresAt');
    if (
      reviewed !== activated ||
      reviewed < created ||
      expiry <= activated ||
      expiry - activated > 90 * 24 * 60 * 60 * 1000
    ) {
      invalid('Active v7 lifecycle must use one review/activation time and an expiry within 90 days.');
    }
    validateApprovedApproval(value, created, reviewed);
    if (options.requireActive && (options.now ?? new Date()).getTime() >= expiry) {
      throw new PostMigrationAttestationValidationError(
        'POST_MIGRATION_ATTESTATION_EXPIRED',
        'Post-migration attestation has expired.'
      );
    }
  }
  if (options.requireActive && !active) {
    throw new PostMigrationAttestationValidationError(
      'POST_MIGRATION_ATTESTATION_INACTIVE',
      `Post-migration attestation is ${value.status}.`
    );
  }
  return value;
}

export function validatePostMigrationAttestationTransition(input: {
  source: LineageAttestation;
  sourceArtifactSha256: string;
  candidate: PostMigrationLineageAttestation;
  now?: Date;
  requireActive?: boolean;
}) {
  validateLineageAttestation(input.source);
  const sourceCanonicalSha256 = createHash('sha256')
    .update(canonicalJson(input.source), 'utf8')
    .digest('hex');
  if (
    input.source.version !== ATTESTATION_VERSION ||
    input.source.attestationId !== ATTESTATION_ID ||
    input.source.status !== 'retired' ||
    input.sourceArtifactSha256 !== POST_MIGRATION_SOURCE_ATTESTATION_SHA256 ||
    sourceCanonicalSha256 !== POST_MIGRATION_SOURCE_ATTESTATION_CANONICAL_SHA256 ||
    input.source.pilotStageCompensatingControl?.captures.length !== 2 ||
    input.source.approvals.length !== 1
  ) {
    invalid('v7 requires the exact retired v6 source with retained R19 evidence and approval.');
  }
  return validatePostMigrationLineageAttestation(input.candidate, {
    now: input.now,
    requireActive: input.requireActive
  });
}

export function validatePostMigrationApprovalPackage(
  value: PostMigrationApprovalPackage,
  candidate: PostMigrationLineageAttestation
) {
  validatePostMigrationLineageAttestation(candidate);
  const expectedStatus = candidate.status === 'active' ? 'approved' : 'awaiting-qualified-human';
  if (
    value.version !== POST_MIGRATION_APPROVAL_PACKAGE_VERSION ||
    value.status !== expectedStatus ||
    value.attestationVersion !== POST_MIGRATION_ATTESTATION_VERSION ||
    value.attestationTemplateReference !==
      'prisma/lineage-attestations/adr-0024-production-post-migration-v7.json' ||
    canonicalJson(value.sourceAttestation) !== canonicalJson(POST_MIGRATION_SOURCE_ATTESTATION) ||
    canonicalJson(value.evidence) !== canonicalJson(POST_MIGRATION_EVIDENCE_BUNDLE) ||
    canonicalJson(value.reviewerTemplate) !== canonicalJson(candidate.approval)
  ) {
    invalid('Post-migration approval package is not bound to the exact pending v7 attestation.');
  }
  exactString(value.nextAction, 'approvalPackage.nextAction');
  if (candidate.status === 'pending-approval') validatePendingApproval(value.reviewerTemplate);
  return value;
}

export function validatePostMigrationExecutiveRiskAcceptance(input: {
  value: PostMigrationExecutiveRiskAcceptance;
  postMigrationAttestation: PostMigrationLineageAttestation;
  postMigrationAttestationArtifactSha256: string;
}) {
  const { value, postMigrationAttestation } = input;
  validatePostMigrationLineageAttestation(postMigrationAttestation);
  if (
    postMigrationAttestation.status !== 'pending-approval' ||
    postMigrationAttestation.approval.status !== 'pending' ||
    postMigrationAttestation.approval.reviewerName !== null ||
    postMigrationAttestation.approval.approvedAt !== null ||
    postMigrationAttestation.approval.acknowledgement.accepted !== null
  ) {
    invalid('Executive closure requires truthful pending v7 history with zero approval.');
  }
  if (input.postMigrationAttestationArtifactSha256 !== POST_MIGRATION_V7_ARTIFACT_SHA256) {
    invalid('Executive closure must bind the exact immutable pending v7 artifact.');
  }
  if (
    value.version !== POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_VERSION ||
    value.decisionId !== POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_ID ||
    value.status !== 'accepted-and-closed' ||
    value.recordedAt !== POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_RECORDED_AT
  ) {
    invalid('Unsupported executive risk-acceptance identity, status or timestamp.');
  }
  timestamp(value.recordedAt, 'executiveRiskAcceptance.recordedAt');
  if (
    canonicalJson(value.decisionMaker) !==
    canonicalJson({ name: PILOT_STAGE_ACCOUNTABLE_PERSON, roles: ['CEO', 'PRODUCTION_OWNER'] })
  ) {
    invalid('Executive risk acceptance must identify the exact CEO and Production Owner.');
  }
  if (
    canonicalJson(value.binding) !==
    canonicalJson(POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_BINDING)
  ) {
    invalid('Executive risk acceptance is not bound to the exact ADR-0024 R2 incident evidence.');
  }
  if (
    canonicalJson(value.independentReview) !==
    canonicalJson(POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_REVIEW_STATE)
  ) {
    invalid('Executive risk acceptance must preserve the unfulfilled independent-review state.');
  }
  if (
    canonicalJson(value.decision) !==
      canonicalJson(POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_DECISION) ||
    canonicalJson(value.acknowledgements) !==
      canonicalJson(POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_ACKNOWLEDGEMENTS) ||
    canonicalJson(value.prohibitions) !==
      canonicalJson(POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_PROHIBITIONS) ||
    canonicalJson(value.evidenceReferences) !==
      canonicalJson(POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_EVIDENCE_REFERENCES)
  ) {
    invalid('Executive closure decision, acknowledgements, prohibitions and evidence must be exact.');
  }
  return value;
}
