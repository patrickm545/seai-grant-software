import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AttestationValidationError,
  PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT,
  PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES,
  REQUIRED_APPROVAL_ACKNOWLEDGEMENTS,
  REQUIRED_APPROVAL_ROLES,
  REQUIRED_APPROVAL_SCOPE,
  validateLineageAttestation,
  type LineageAttestation
} from '../../lib/lineage-attestation';
import { assertPilotAuthHistoricalResolvedCatalog } from '../../lib/historical-resolved-migration';
import { fingerprintCatalog } from '../../lib/schema-fingerprint';
import { preMigrationCatalogWithPilotAuth } from './historical-resolved-migration-fixture';
import {
  checkedInLineageAttestation,
  pendingLineageAttestationFixture
} from './lineage-attestation-fixture';

const checkedIn = checkedInLineageAttestation();
const pending = pendingLineageAttestationFixture();

function populateActiveHistoricalResolvedMigration(
  value: LineageAttestation,
  input: {
    artifactReferences?: [string, string];
    artifactSha256s?: [string, string];
    changeId?: string;
    repositoryRevision?: string;
    recoveryEvidenceReference?: string;
  } = {}
) {
  const catalog = preMigrationCatalogWithPilotAuth();
  const fingerprint = fingerprintCatalog(catalog).fingerprint;
  const assertions = assertPilotAuthHistoricalResolvedCatalog(catalog);
  const historical = value.historicalResolvedMigrations[0];
  const artifactReferences = input.artifactReferences ?? [
    'CHANGE-001/CAPTURE-1',
    'CHANGE-001/CAPTURE-2'
  ];
  const artifactSha256s = input.artifactSha256s ?? ['d'.repeat(64), 'f'.repeat(64)];
  historical.exactLedgerTimestamps.startedAt = '2026-07-17T13:00:00.123456Z';
  historical.exactLedgerTimestamps.finishedAt = '2026-07-17T13:00:00.123456Z';
  historical.observedCurrentSchema.fingerprint = fingerprint;
  historical.observedCurrentSchema.catalogAssertionsDigest = assertions.assertionsDigest;
  historical.observedCurrentSchema.evidenceReference = artifactReferences[0];
  historical.observedCurrentSchema.evidenceSha256 = artifactSha256s[0];
  historical.r14Evidence.changeId = input.changeId ?? 'CLADA-CHG-ADR0024-PILOT-001';
  historical.r14Evidence.repositoryRevision = input.repositoryRevision ?? '1'.repeat(40);
  historical.r14Evidence.captureArtifactReferences = [...artifactReferences];
  historical.r14Evidence.captureArtifactSha256s = [...artifactSha256s];
  historical.r14Evidence.recoveryEvidenceReference =
    input.recoveryEvidenceReference ?? 'NEON-PITR-2026-07-28T00:30:00.000Z';
  value.schema.preMigrationFingerprint = fingerprint;
  return { catalog, fingerprint, assertions };
}

export function activeAttestation(): LineageAttestation {
  const value = structuredClone(pending);
  value.governanceMode = 'standard-independent-human';
  value.pilotStageCompensatingControl = null;
  value.status = 'active';
  value.reviewedAt = '2026-07-28T01:00:00.000Z';
  value.expiresAt = '2026-10-26T00:00:00.000Z';
  value.relatedMigration.failedRecord.id = '11111111-1111-4111-8111-111111111111';
  value.relatedMigration.failedRecord.logsDigest = 'a'.repeat(64);
  value.relatedMigration.completedZeroStepRecord.id = '22222222-2222-4222-8222-222222222222';
  populateActiveHistoricalResolvedMigration(value);
  value.schema.postMigrationFingerprint = 'c'.repeat(64);
  value.schema.freshHeadFingerprint = 'c'.repeat(64);
  const reviewers = [
    'Patrick McKenna',
    'Aisling Byrne',
    "Niamh O'Sullivan",
    'Patrick McKenna'
  ];
  value.approvals = REQUIRED_APPROVAL_ROLES.map((role, index) => ({
    role,
    status: 'approved',
    reviewer: reviewers[index],
    approvedAt: '2026-07-28T01:00:00.000Z',
    evidenceReference: `docs/approvals/ADR0024-${index + 1}.md`,
    scopeAccepted: REQUIRED_APPROVAL_SCOPE,
    acknowledgements: [...REQUIRED_APPROVAL_ACKNOWLEDGEMENTS],
    conditions: []
  }));
  value.evidenceReferences.push(
    ...value.approvals.map((approval) => approval.evidenceReference!)
  );
  return value;
}

function activePilotStageAttestation(): LineageAttestation {
  const value = structuredClone(pending);
  value.status = 'active';
  value.reviewedAt = '2026-07-28T01:00:00.000Z';
  value.expiresAt = '2026-10-26T00:00:00.000Z';
  value.relatedMigration.failedRecord.id = '11111111-1111-4111-8111-111111111111';
  value.relatedMigration.failedRecord.logsDigest = 'a'.repeat(64);
  value.relatedMigration.completedZeroStepRecord.id = '22222222-2222-4222-8222-222222222222';
  const historical = populateActiveHistoricalResolvedMigration(value);
  value.schema.postMigrationFingerprint = 'c'.repeat(64);
  value.schema.freshHeadFingerprint = 'c'.repeat(64);
  const evidenceReference = 'docs/approvals/ADR0024-pilot-production-owner.md';
  value.evidenceReferences.push(evidenceReference);
  value.approvals = [{
    role: 'PRODUCTION_OWNER',
    status: 'approved',
    reviewer: 'Patrick McKenna',
    approvedAt: value.reviewedAt,
    evidenceReference,
    scopeAccepted: REQUIRED_APPROVAL_SCOPE,
    acknowledgements: [...REQUIRED_APPROVAL_ACKNOWLEDGEMENTS],
    conditions: []
  }];
  const commonCapture = {
    artifactSha256: 'd'.repeat(64),
    deterministicEvidenceDigest: 'e'.repeat(64),
    repositoryRevision: '1'.repeat(40),
    changeId: 'CLADA-CHG-ADR0024-PILOT-001',
    databaseFingerprint: 'db_4e1d3bd23cff6801' as const,
    connectedDatabaseName: 'clada-production',
    operator: 'Patrick McKenna' as const,
    restorePointReference: 'NEON-PITR-2026-07-28T00:30:00.000Z',
    schemaFingerprint: historical.fingerprint,
    namedAssertionsVersion: 'adr-0024-catalog-assertions/v2' as const
  };
  value.pilotStageCompensatingControl!.activatedAt = value.reviewedAt;
  value.pilotStageCompensatingControl!.captures = [
    { ...commonCapture, artifactReference: 'CHANGE-001/CAPTURE-1' },
    { ...commonCapture, artifactReference: 'CHANGE-001/CAPTURE-2', artifactSha256: 'f'.repeat(64) }
  ];
  value.pilotStageCompensatingControl!.repeatedDeterministicFieldsMatch = true;
  return value;
}

test('checked-in R19 attestation is active with exact retained evidence', () => {
  assert.equal(
    validateLineageAttestation(checkedIn, { requireActive: true }).status,
    'active'
  );
  assert.equal(checkedIn.version, 'clada-adr-0024-lineage-attestation/v5');
  assert.equal(checkedIn.reviewedAt, '2026-08-17T17:26:47.280Z');
  assert.equal(checkedIn.expiresAt, '2026-10-25T17:26:47.280Z');
  assert.equal(checkedIn.governanceMode, 'pilot-stage-compensating-control');
  assert.equal(
    checkedIn.pilotStageCompensatingControl?.accountabilityAcknowledgement,
    PILOT_STAGE_ACCOUNTABILITY_ACKNOWLEDGEMENT
  );
  assert.equal(checkedIn.approvals.length, 1);
  assert.equal(checkedIn.approvals[0].reviewer, 'Patrick McKenna');
  assert.equal(checkedIn.pilotStageCompensatingControl?.captures.length, 2);
  assert.equal(
    checkedIn.pilotStageCompensatingControl?.captures[0].deterministicEvidenceDigest,
    '19027bc451ba6fd25b17ccfd69f4106c5562df1cb396928b7b91aab74697fb98'
  );
  assert.equal(
    checkedIn.pilotStageCompensatingControl?.repeatedDeterministicFieldsMatch,
    true
  );
  assert.deepEqual(
    checkedIn.repositoryMigrationChecksumDivergences,
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES
  );
  assert.equal(checkedIn.historicalResolvedMigrations.length, 1);
  assert.equal(
    checkedIn.historicalResolvedMigrations[0].stateName,
    'attestedHistoricalResolvedMigration'
  );
  assert.equal(
    checkedIn.historicalResolvedMigrations[0].exactLedgerTimestamps.startedAt,
    '2026-07-17T15:34:36.767818Z'
  );
  assert.equal(
    checkedIn.historicalResolvedMigrations[0].exactLedgerTimestamps.finishedAt,
    '2026-07-17T15:34:36.767818Z'
  );
  assert.equal(
    checkedIn.historicalResolvedMigrations[0].observedCurrentSchema.fingerprint,
    '1d1354ca5bf23142fee9cbe3302b7a88c670c1426594563d70a1c24d35151d81'
  );
  assert.equal(checkedIn.missingMigration.startedAt, '2026-04-23T07:04:10.39554Z');
  assert.equal(checkedIn.missingMigration.finishedAt, '2026-04-23T07:04:10.527739Z');
  assert.equal(
    checkedIn.relatedMigration.failedRecord.startedAt,
    '2026-04-29T06:01:05.497406Z'
  );
  assert.equal(
    checkedIn.relatedMigration.failedRecord.rolledBackAt,
    '2026-04-29T06:01:38.423504Z'
  );
  assert.equal(
    checkedIn.relatedMigration.completedZeroStepRecord.startedAt,
    '2026-04-29T06:01:38.54346Z'
  );
  assert.equal(
    checkedIn.relatedMigration.completedZeroStepRecord.finishedAt,
    '2026-04-29T06:01:38.54346Z'
  );
});

test('synthetic pending fixture preserves pre-activation fail-closed coverage', () => {
  assert.equal(validateLineageAttestation(pending).status, 'pending');
  assert.equal(pending.reviewedAt, null);
  assert.equal(pending.expiresAt, null);
  assert.deepEqual(pending.approvals, []);
  assert.equal(pending.pilotStageCompensatingControl?.captures.length, 0);
  assert.throws(
    () => validateLineageAttestation(pending, { requireActive: true }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_INACTIVE'
  );
});

test('migration-record timestamps must already use canonical significant precision', () => {
  for (const value of [
    '2026-04-23T07:04:10.395540Z',
    '2026-04-23T07:04:10.395000Z'
  ]) {
    const attestation = structuredClone(pending);
    attestation.missingMigration.startedAt = value;
    assert.throws(() => validateLineageAttestation(attestation), /must already be.*canonical/);
  }
});

test('pilot-stage mode activates only with exact compensating controls and Patrick accountability', () => {
  const active = activePilotStageAttestation();
  assert.equal(validateLineageAttestation(active, { requireActive: true }).status, 'active');

  const mismatched = activePilotStageAttestation();
  mismatched.pilotStageCompensatingControl!.captures[1].changeId = 'DIFFERENT-CHANGE';
  assert.throws(() => validateLineageAttestation(mismatched), /must match (?:both|exactly)/);

  const weakenedStatusRequirement = activePilotStageAttestation();
  weakenedStatusRequirement.pilotStageCompensatingControl!.requiredProductionStatusExitCode =
    0 as never;
  assert.throws(() => validateLineageAttestation(weakenedStatusRequirement), /must be exact/);

  const fakeHumanReviewer = activePilotStageAttestation();
  fakeHumanReviewer.pilotStageCompensatingControl!.independentHumanTechnicalReviewer =
    'ChatGPT' as never;
  assert.throws(() => validateLineageAttestation(fakeHumanReviewer), /must be exact/);
});

test('active attestation requires exact approvals and non-expired lifecycle', () => {
  const active = activeAttestation();
  assert.equal(
    validateLineageAttestation(active, {
      requireActive: true,
      now: new Date('2026-08-01T00:00:00.000Z')
    }).status,
    'active'
  );
  const expired = structuredClone(active);
  assert.throws(
    () =>
      validateLineageAttestation(expired, {
        requireActive: true,
        now: new Date('2026-10-26T00:00:00.000Z')
      }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_EXPIRED'
  );
  const incomplete = structuredClone(active);
  incomplete.approvals[0].reviewer = null;
  assert.throws(() => validateLineageAttestation(incomplete, { requireActive: true }), /incomplete/);
});

test('attestation rejects wildcards, unsupported versions, wrong target, and overlong expiry', () => {
  const wildcard = structuredClone(pending);
  wildcard.reason = '*';
  assert.throws(() => validateLineageAttestation(wildcard), /non-wildcard/);
  const unsupported = structuredClone(pending) as unknown as { version: string };
  unsupported.version = 'v2';
  assert.throws(() => validateLineageAttestation(unsupported as LineageAttestation), /Unsupported/);
  const wrongTarget = structuredClone(pending) as unknown as { approvedDatabaseFingerprint: string };
  wrongTarget.approvedDatabaseFingerprint = 'db_31449de1074844bb';
  assert.throws(() => validateLineageAttestation(wrongTarget as LineageAttestation), /target identity/);
  const overlong = activeAttestation();
  overlong.expiresAt = '2026-10-27T00:00:00.000Z';
  assert.throws(() => validateLineageAttestation(overlong), /within 90 days/);
});

test('changing pending status alone cannot activate without exact evidence, approvals, and lifecycle', () => {
  const statusOnly = structuredClone(pending);
  statusOnly.status = 'active';
  assert.throws(
    () => validateLineageAttestation(statusOnly, { requireActive: true }),
    /historicalResolvedMigration\.exactLedgerTimestamps\.startedAt/
  );
});

test('active approval boundary rejects placeholders, altered scope, unindexed evidence, and lost independence', () => {
  const placeholder = activeAttestation();
  placeholder.approvals[0].reviewer = 'reviewer-1';
  assert.throws(() => validateLineageAttestation(placeholder), /placeholder/);

  const alteredScope = activeAttestation();
  alteredScope.approvals[0].acknowledgements = ['Historical SQL remains unknown'];
  assert.throws(() => validateLineageAttestation(alteredScope), /acknowledgements/);

  const unindexed = activeAttestation();
  unindexed.evidenceReferences = unindexed.evidenceReferences.filter(
    (reference) => reference !== unindexed.approvals[0].evidenceReference
  );
  assert.throws(() => validateLineageAttestation(unindexed), /not indexed/);

  const externalEvidence = activeAttestation();
  externalEvidence.approvals[0].evidenceReference = 'CHANGE-ADR0024-1';
  externalEvidence.evidenceReferences.push('CHANGE-ADR0024-1');
  assert.throws(() => validateLineageAttestation(externalEvidence), /repository Markdown path/);

  const notIndependent = activeAttestation();
  notIndependent.approvals[1].reviewer = notIndependent.approvals[3].reviewer;
  assert.throws(() => validateLineageAttestation(notIndependent), /independent/);
});

test('active approval and review timestamps must be lifecycle ordered', () => {
  const beforeCreation = activeAttestation();
  beforeCreation.approvals[0].approvedAt = '2026-07-27T23:59:59.999Z';
  assert.throws(() => validateLineageAttestation(beforeCreation), /lifecycle/);

  const afterReview = activeAttestation();
  afterReview.approvals[0].approvedAt = '2026-07-28T01:00:00.001Z';
  assert.throws(() => validateLineageAttestation(afterReview), /lifecycle/);
});
