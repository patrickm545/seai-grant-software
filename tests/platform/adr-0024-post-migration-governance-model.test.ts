import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  POST_MIGRATION_ACKNOWLEDGEMENT_STATEMENTS,
  POST_MIGRATION_ACKNOWLEDGEMENT_VERSION,
  POST_MIGRATION_ATTESTATION_VERSION,
  POST_MIGRATION_EVIDENCE_BUNDLE,
  POST_MIGRATION_SOURCE_ATTESTATION_SHA256,
  PostMigrationAttestationValidationError,
  validatePostMigrationApprovalPackage,
  validatePostMigrationAttestationTransition,
  validatePostMigrationLineageAttestation,
  type PostMigrationApprovalPackage,
  type PostMigrationLineageAttestation
} from '../../lib/post-migration-lineage-attestation';
import type { LineageAttestation } from '../../lib/lineage-attestation';
import { checkedInLineageAttestation } from './lineage-attestation-fixture';

const candidatePath = 'prisma/lineage-attestations/adr-0024-production-post-migration-v7.json';
const packagePath =
  'docs/03-engineering/evidence/ADR_0024_POST_MIGRATION_APPROVAL_PACKAGE_V7.json';
const sourcePath = 'prisma/lineage-attestations/adr-0024-production.json';

function checkedInCandidate() {
  return JSON.parse(readFileSync(candidatePath, 'utf8')) as PostMigrationLineageAttestation;
}

function checkedInPackage() {
  return JSON.parse(readFileSync(packagePath, 'utf8')) as PostMigrationApprovalPackage;
}

function sourceSha256() {
  return createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
}

function activeCandidate() {
  const value = checkedInCandidate();
  const approvedAt = '2026-09-01T12:00:00.000Z';
  const approvalReference = 'docs/approvals/ADR0024-synthetic-v7-approval.md';
  const qualificationReference = 'docs/approvals/ADR0024-synthetic-v7-qualification.md';
  value.status = 'active';
  value.reviewedAt = approvedAt;
  value.activatedAt = approvedAt;
  value.expiresAt = '2026-11-30T12:00:00.000Z';
  value.evidenceReferences.push(approvalReference, qualificationReference);
  value.approval = {
    ...value.approval,
    status: 'approved',
    reviewerName: 'Synthetic Alex Rowan',
    independentFromProductionOwner: true,
    technicalQualification: {
      basis: 'declared-relevant-postgresql-migration-reliability-experience',
      databaseMigrationExperience: true,
      postgresqlReliabilityExperience: true,
      adr0024EvidenceReviewCompleted: true,
      experienceDeclaration:
        'Synthetic fixture declaration covering PostgreSQL migration review and database reliability controls.',
      evidenceReference: qualificationReference,
      acknowledgedAt: '2026-09-01T11:59:00.000Z'
    },
    evidenceReference: approvalReference,
    approvedAt,
    binding: {
      ...value.approval.binding,
      governanceRepositoryRevision: 'a'.repeat(40)
    },
    acknowledgement: {
      ...value.approval.acknowledgement,
      accepted: true
    }
  };
  return value;
}

function assertInvalid(value: PostMigrationLineageAttestation, pattern?: RegExp) {
  assert.throws(
    () => validatePostMigrationLineageAttestation(value),
    (error: unknown) =>
      error instanceof PostMigrationAttestationValidationError &&
      error.code === 'POST_MIGRATION_ATTESTATION_INVALID' &&
      (!pattern || pattern.test(error.message))
  );
}

test('checked-in v7 is a structurally signable pending package with zero approval', () => {
  const candidate = checkedInCandidate();
  const approvalPackage = checkedInPackage();
  assert.equal(validatePostMigrationLineageAttestation(candidate).status, 'pending-approval');
  assert.equal(validatePostMigrationApprovalPackage(approvalPackage, candidate).status, 'awaiting-qualified-human');
  assert.equal(candidate.approval.status, 'pending');
  assert.equal(candidate.approval.reviewerName, null);
  assert.equal(candidate.approval.technicalQualification?.experienceDeclaration, null);
  assert.equal(candidate.approval.technicalQualification?.evidenceReference, null);
  assert.equal(candidate.approval.approvedAt, null);
  assert.equal(candidate.activatedAt, null);
});

test('exact retired v6 source and raw SHA-256 validate the pending v7 transition', () => {
  assert.equal(sourceSha256(), POST_MIGRATION_SOURCE_ATTESTATION_SHA256);
  assert.equal(
    validatePostMigrationAttestationTransition({
      source: checkedInLineageAttestation(),
      sourceArtifactSha256: sourceSha256(),
      candidate: checkedInCandidate()
    }).status,
    'pending-approval'
  );
});

test('retired v6 cannot transition to active merely because R2 evidence exists', () => {
  const value = checkedInCandidate();
  value.status = 'active';
  value.reviewedAt = '2026-09-01T12:00:00.000Z';
  value.activatedAt = value.reviewedAt;
  value.expiresAt = '2026-11-30T12:00:00.000Z';
  assertInvalid(value, /qualified-human approval/);
});

test('only one R2 capture fails atomic evidence validation', () => {
  const value = checkedInCandidate();
  value.evidence.captures.splice(1, 1);
  assertInvalid(value, /atomic R2 bundle/);
});

test('one R2 capture plus one historical R19 capture fails', () => {
  const value = checkedInCandidate();
  const historical = checkedInLineageAttestation().pilotStageCompensatingControl!.captures[0];
  value.evidence.captures[1].artifactReference = historical.artifactReference;
  value.evidence.captures[1].artifactSha256 = historical.artifactSha256;
  assertInvalid(value, /atomic R2 bundle/);
});

test('two historical R19 captures cannot satisfy post-migration evidence', () => {
  const value = checkedInCandidate();
  const historical = checkedInLineageAttestation().pilotStageCompensatingControl!.captures;
  value.evidence.captures[0].artifactReference = historical[0].artifactReference;
  value.evidence.captures[0].artifactSha256 = historical[0].artifactSha256;
  value.evidence.captures[1].artifactReference = historical[1].artifactReference;
  value.evidence.captures[1].artifactSha256 = historical[1].artifactSha256;
  assertInvalid(value, /atomic R2 bundle/);
});

for (const [name, mutate] of [
  [
    'wrong R2 capture 1 hash fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.captures[0].artifactSha256 = '0'.repeat(64);
    }
  ],
  [
    'wrong R2 capture 2 hash fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.captures[1].artifactSha256 = '0'.repeat(64);
    }
  ],
  [
    'wrong deterministic digest fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.deterministicEvidenceDigest = '0'.repeat(64);
    }
  ],
  [
    'wrong Production fingerprint fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.postMigrationFingerprint = '0'.repeat(64);
    }
  ],
  [
    'wrong R2 change ID fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.changeId = 'CHG-WRONG';
    }
  ],
  [
    'wrong evidence version fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.evidenceVersion = 'adr-0024-production-post-migration-evidence/v0';
    }
  ],
  [
    'wrong evidence repository revision fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.evidenceRepositoryRevision = '0'.repeat(40);
    }
  ],
  [
    'wrong operation-boundary digest fails',
    (value: PostMigrationLineageAttestation) => {
      value.evidence.operationBoundary.artifactSha256 = '0'.repeat(64);
    }
  ]
] as const) {
  test(name, () => {
    const value = checkedInCandidate();
    mutate(value);
    assertInvalid(value, /atomic R2 bundle/);
  });
}

test('historical R19 approval cannot be replayed as the v7 approval', () => {
  const value = activeCandidate();
  value.approval.reviewerName = 'Patrick McKenna';
  value.approval.technicalQualification = null;
  value.approval.evidenceReference =
    checkedInLineageAttestation().approvals[0].evidenceReference;
  assertInvalid(value, /qualified-human approval/);
});

test('approval lacking reviewer identity fails', () => {
  const value = activeCandidate();
  value.approval.reviewerName = null;
  assertInvalid(value, /qualified-human approval/);
});

test('approval lacking technical qualification fails', () => {
  const value = activeCandidate();
  value.approval.technicalQualification = null;
  assertInvalid(value, /qualified-human approval/);
});

test('approval lacking qualification evidence fails', () => {
  const value = activeCandidate();
  value.approval.technicalQualification!.evidenceReference = '';
  assertInvalid(value, /non-wildcard/);
});

test('Database Reliability Reviewer cannot equal the Production Owner', () => {
  const value = activeCandidate();
  value.approval.reviewerName = 'Patrick McKenna';
  assertInvalid(value, /independent/);
});

for (const aiReviewer of ['AI', 'Codex', 'ChatGPT', 'OpenAI', 'Claude', 'Gemini', 'Copilot']) {
  test(`${aiReviewer} cannot be represented as the qualified human reviewer`, () => {
    const value = activeCandidate();
    value.approval.reviewerName = aiReviewer;
    assertInvalid(value, /real qualified human/);
  });
}

test('missing post-migration acknowledgement fails', () => {
  const value = activeCandidate();
  value.approval.acknowledgement.statements = [];
  assertInvalid(value, /acknowledgement/);
});

test('historical pre-migration acknowledgement cannot be used for v7', () => {
  const value = activeCandidate();
  value.approval.acknowledgement.statements = ['No Production migration has been applied'];
  assertInvalid(value, /acknowledgement/);
});

test('one-character acknowledgement modification fails', () => {
  const value = activeCandidate();
  value.approval.acknowledgement.statements[0] += ' altered';
  assertInvalid(value, /acknowledgement/);
});

test('wrong acknowledgement version fails', () => {
  const value = activeCandidate();
  value.approval.acknowledgement.version =
    'clada-adr-0024-post-migration-acknowledgement/v0';
  assertInvalid(value, /acknowledgement/);
});

test('approval before R2 evidence completion fails', () => {
  const value = activeCandidate();
  value.reviewedAt = '2026-08-27T09:40:39.000Z';
  value.activatedAt = value.reviewedAt;
  value.approval.approvedAt = value.reviewedAt;
  value.approval.technicalQualification!.acknowledgedAt = value.reviewedAt;
  assertInvalid(value, /lifecycle|not ordered/);
});

test('expired active approval fails requireActive validation', () => {
  const value = activeCandidate();
  assert.throws(
    () =>
      validatePostMigrationLineageAttestation(value, {
        requireActive: true,
        now: new Date('2026-11-30T12:00:00.000Z')
      }),
    (error: unknown) =>
      error instanceof PostMigrationAttestationValidationError &&
      error.code === 'POST_MIGRATION_ATTESTATION_EXPIRED'
  );
});

test('activation timestamp must equal review timestamp', () => {
  const value = activeCandidate();
  value.activatedAt = '2026-09-01T12:00:00.001Z';
  assertInvalid(value, /lifecycle/);
});

test('expiry longer than 90 days fails', () => {
  const value = activeCandidate();
  value.expiresAt = '2026-11-30T12:00:00.001Z';
  assertInvalid(value, /within 90 days/);
});

test('altered historical checksum tuple source fails transition', () => {
  const source = checkedInLineageAttestation() as LineageAttestation;
  const divergences = source.repositoryMigrationChecksumDivergences as unknown as Array<{
    recordId: string;
  }>;
  divergences[0].recordId = '00000000-0000-4000-8000-000000000000';
  assert.throws(() =>
    validatePostMigrationAttestationTransition({
      source,
      sourceArtifactSha256: sourceSha256(),
      candidate: checkedInCandidate()
    })
  );
});

test('altered pilot-auth historical state fails transition', () => {
  const source = checkedInLineageAttestation();
  source.historicalResolvedMigrations[0].exactLedgerTimestamps.startedAt =
    '2026-07-17T15:34:36.767819Z';
  assert.throws(() =>
    validatePostMigrationAttestationTransition({
      source,
      sourceArtifactSha256: sourceSha256(),
      candidate: checkedInCandidate()
    })
  );
});

test('source attestation artifact substitution fails', () => {
  assert.throws(() =>
    validatePostMigrationAttestationTransition({
      source: checkedInLineageAttestation(),
      sourceArtifactSha256: '0'.repeat(64),
      candidate: checkedInCandidate()
    })
  );
});

test('approval replay against another governance revision fails', () => {
  const value = activeCandidate();
  value.approval.binding.governanceRepositoryRevision = 'not-a-git-revision';
  assertInvalid(value, /governance revision/);
});

test('unindexed approval evidence fails', () => {
  const value = activeCandidate();
  value.evidenceReferences = value.evidenceReferences.filter(
    (reference) => reference !== value.approval.evidenceReference
  );
  assertInvalid(value, /not indexed/);
});

test('qualification self-assertion without required experience categories fails', () => {
  const value = activeCandidate();
  value.approval.technicalQualification!.postgresqlReliabilityExperience = false as true;
  assertInvalid(value, /qualification declaration/);
});

test('fully bound synthetic independent qualified-human approval can activate v7', () => {
  const value = activeCandidate();
  assert.equal(
    validatePostMigrationAttestationTransition({
      source: checkedInLineageAttestation(),
      sourceArtifactSha256: sourceSha256(),
      candidate: value,
      requireActive: true,
      now: new Date('2026-09-02T00:00:00.000Z')
    }).status,
    'active'
  );
  assert.equal(value.version, POST_MIGRATION_ATTESTATION_VERSION);
  assert.equal(value.evidence.changeId, POST_MIGRATION_EVIDENCE_BUNDLE.changeId);
  assert.deepEqual(value.approval.acknowledgement.statements, [
    ...POST_MIGRATION_ACKNOWLEDGEMENT_STATEMENTS
  ]);
  assert.equal(value.approval.acknowledgement.version, POST_MIGRATION_ACKNOWLEDGEMENT_VERSION);
});

test('completed signable package can be bound to the synthetic active approval', () => {
  const value = activeCandidate();
  const approvalPackage = checkedInPackage();
  approvalPackage.status = 'approved';
  approvalPackage.reviewerTemplate = structuredClone(value.approval);
  assert.equal(validatePostMigrationApprovalPackage(approvalPackage, value).status, 'approved');
});
