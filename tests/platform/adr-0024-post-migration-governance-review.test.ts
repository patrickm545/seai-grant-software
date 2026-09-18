import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  REQUIRED_APPROVAL_ACKNOWLEDGEMENTS,
  validateLineageAttestation,
  type LineageAttestation
} from '../../lib/lineage-attestation';
import { checkedInLineageAttestation } from './lineage-attestation-fixture';

const R2_CHANGE_ID = 'CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2';
const R2_FINGERPRINT = '22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989';
const R2_CAPTURE_1 =
  'ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/capture-1.json';
const R2_CAPTURE_1_SHA256 =
  'f59fd81139d9a3a83954babc50b861742a6dd27d5d697dde5c318a1ea74c5866';
const R2_CAPTURE_2_SHA256 =
  'a5ca135428fffb4c8266268b928fad0e5225d9c3239096135dbd542c0f1cbf44';
const R2_DIGEST = '89e0ef66a07f3390b83c378e323eca699cc71012b66ea601889eb5dc1a100a8b';

type GovernanceReview = {
  status: string;
  productionAccess: boolean;
  authoritativeOperation: {
    changeId: string;
    capture1: { sha256: string };
    capture2: { sha256: string };
    deterministicEvidenceDigest: string;
    schema: { fingerprint: string };
    ordinaryHistoricalTupleCount: number;
    pilotAuthHistoricalResolvedVerified: boolean;
  };
  attestationAfter: {
    status: string;
    postMigrationFingerprint: null;
    postMigrationEvidence: null;
    activationPerformed: boolean;
  };
  implementedQualificationRules: {
    postMigrationQualifiedHumanRuleImplemented: boolean;
  };
  nextAction: string;
};

function governanceReview(): GovernanceReview {
  return JSON.parse(
    readFileSync(
      'docs/03-engineering/evidence/ADR_0024_POST_MIGRATION_GOVERNANCE_REVIEW.json',
      'utf8'
    )
  ) as GovernanceReview;
}

test('governance review pins exact R2 evidence and keeps the attestation retired', () => {
  const review = governanceReview();
  assert.equal(review.status, 'governance-defect-blocked');
  assert.equal(review.productionAccess, false);
  assert.equal(review.authoritativeOperation.changeId, R2_CHANGE_ID);
  assert.equal(review.authoritativeOperation.capture1.sha256, R2_CAPTURE_1_SHA256);
  assert.equal(review.authoritativeOperation.capture2.sha256, R2_CAPTURE_2_SHA256);
  assert.equal(review.authoritativeOperation.deterministicEvidenceDigest, R2_DIGEST);
  assert.equal(review.authoritativeOperation.schema.fingerprint, R2_FINGERPRINT);
  assert.equal(review.authoritativeOperation.ordinaryHistoricalTupleCount, 7);
  assert.equal(review.authoritativeOperation.pilotAuthHistoricalResolvedVerified, true);
  assert.equal(review.attestationAfter.status, 'retired');
  assert.equal(review.attestationAfter.postMigrationFingerprint, null);
  assert.equal(review.attestationAfter.postMigrationEvidence, null);
  assert.equal(review.attestationAfter.activationPerformed, false);
  assert.equal(review.implementedQualificationRules.postMigrationQualifiedHumanRuleImplemented, false);
  assert.equal(review.nextAction, 'Governance defect found — repository repair required first.');
});

test('known v6 defect: retained R19 approval can satisfy a synthetic R2 activation snapshot', () => {
  const value = checkedInLineageAttestation();
  value.status = 'active';
  value.schema.postMigrationFingerprint = R2_FINGERPRINT;
  value.schema.postMigrationEvidence = {
    provenance: 'production-read-only-capture',
    environment: 'production',
    databaseFingerprint: 'db_4e1d3bd23cff6801',
    fingerprint: R2_FINGERPRINT,
    artifactReference: R2_CAPTURE_1,
    artifactSha256: R2_CAPTURE_1_SHA256,
    repositoryRevision: '6eb3ab4bf1763883443793dc46a7be30e8a2e6c0',
    changeId: R2_CHANGE_ID,
    capturedAt: '2026-08-27T09:40:36.895Z'
  };
  value.evidenceReferences.push(R2_CAPTURE_1);

  const accepted = validateLineageAttestation(value, {
    requireActive: true,
    now: new Date('2026-08-31T00:00:00.000Z')
  });

  assert.equal(accepted.status, 'active');
  assert.equal(
    accepted.pilotStageCompensatingControl?.captures[0].changeId,
    'CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19'
  );
  assert.equal(accepted.approvals[0].approvedAt, '2026-08-17T17:26:47.280Z');
  assert.equal(accepted.schema.postMigrationEvidence?.changeId, R2_CHANGE_ID);
  assert.equal('deterministicEvidenceDigest' in accepted.schema.postMigrationEvidence!, false);
});

test('current v6 approval contract cannot express the required post-migration qualified review', () => {
  const value = checkedInLineageAttestation() as LineageAttestation;
  const approval = value.approvals[0] as LineageAttestation['approvals'][number] &
    Record<string, unknown>;

  assert.equal('qualification' in approval, false);
  assert.equal('qualificationEvidenceReference' in approval, false);
  assert.equal('approvedFingerprint' in approval, false);
  assert.equal('approvedDeterministicEvidenceDigest' in approval, false);
  assert.equal(
    REQUIRED_APPROVAL_ACKNOWLEDGEMENTS.includes('No Production migration has been applied'),
    true
  );
});
