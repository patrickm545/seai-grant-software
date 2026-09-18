import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_BINDING,
  POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_ID,
  POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_VERSION,
  POST_MIGRATION_V7_ARTIFACT_SHA256,
  PostMigrationAttestationValidationError,
  validatePostMigrationExecutiveRiskAcceptance,
  type PostMigrationExecutiveRiskAcceptance,
  type PostMigrationLineageAttestation
} from '../../lib/post-migration-lineage-attestation';

const v7Path = 'prisma/lineage-attestations/adr-0024-production-post-migration-v7.json';
const riskAcceptancePath =
  'prisma/lineage-attestations/adr-0024-production-post-migration-executive-risk-acceptance-v1.json';

function checkedInV7() {
  return JSON.parse(readFileSync(v7Path, 'utf8')) as PostMigrationLineageAttestation;
}

function checkedInRiskAcceptance() {
  return JSON.parse(
    readFileSync(riskAcceptancePath, 'utf8')
  ) as PostMigrationExecutiveRiskAcceptance;
}

function v7ArtifactSha256() {
  const repositoryBlob = execFileSync('git', ['show', `HEAD:${v7Path}`], {
    encoding: 'buffer'
  });
  return createHash('sha256').update(repositoryBlob).digest('hex');
}

function validate(value = checkedInRiskAcceptance(), v7 = checkedInV7()) {
  return validatePostMigrationExecutiveRiskAcceptance({
    value,
    postMigrationAttestation: v7,
    postMigrationAttestationArtifactSha256: v7ArtifactSha256()
  });
}

function assertRiskAcceptanceInvalid(
  mutate: (value: PostMigrationExecutiveRiskAcceptance) => void,
  pattern: RegExp
) {
  const value = checkedInRiskAcceptance();
  mutate(value);
  assert.throws(
    () => validate(value),
    (error: unknown) =>
      error instanceof PostMigrationAttestationValidationError && pattern.test(error.message)
  );
}

test('checked-in executive risk acceptance closes only the exact ADR-0024 incident', () => {
  const value = validate();
  assert.equal(value.version, POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_VERSION);
  assert.equal(value.decisionId, POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_ID);
  assert.equal(value.status, 'accepted-and-closed');
  assert.equal(value.binding.adrId, 'ADR-0024');
  assert.equal(value.binding.pullRequest, 45);
  assert.equal(value.decision.reusableForAnotherIncident, false);
});

test('executive risk acceptance pins the immutable pending v7 artifact', () => {
  const value = checkedInRiskAcceptance();
  assert.equal(v7ArtifactSha256(), POST_MIGRATION_V7_ARTIFACT_SHA256);
  assert.equal(value.binding.postMigrationAttestation.artifactSha256, v7ArtifactSha256());
  assert.equal(value.binding.postMigrationAttestation.status, 'pending-approval');
  assert.equal(value.binding.postMigrationAttestation.qualifyingApprovalCount, 0);
});

test('executive risk acceptance is bound to the complete exact R2 identity', () => {
  const value = validate();
  assert.deepEqual(value.binding, POST_MIGRATION_EXECUTIVE_RISK_ACCEPTANCE_BINDING);
  assert.equal(
    value.binding.r2Evidence.changeId,
    'CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2'
  );
  assert.equal(value.binding.r2Evidence.repositoryMigrations, 16);
  assert.equal(value.binding.r2Evidence.appliedRepositoryMigrations, 16);
  assert.equal(value.binding.r2Evidence.pendingRepositoryMigrations, 0);
});

for (const [name, mutate] of [
  [
    'another ADR cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.adrId = 'ADR-9999';
    }
  ],
  [
    'another PR cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.pullRequest = 46;
    }
  ],
  [
    'another incident cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.incidentId = 'INCIDENT-OTHER';
    }
  ],
  [
    'another R2 change ID cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.r2Evidence.changeId = 'CHG-OTHER';
    }
  ],
  [
    'another Production fingerprint cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.productionIdentity.databaseFingerprint = 'db_other';
    }
  ],
  [
    'another schema fingerprint cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.r2Evidence.postMigrationFingerprint = '0'.repeat(64);
    }
  ],
  [
    'another migration cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.r2Evidence.passwordResetMigration.migrationName = '20260918000000_other';
    }
  ],
  [
    'another migration checksum cannot reuse the decision',
    (value: PostMigrationExecutiveRiskAcceptance) => {
      value.binding.r2Evidence.passwordResetMigration.checksum = '0'.repeat(64);
    }
  ]
] as const) {
  test(name, () => assertRiskAcceptanceInvalid(mutate, /exact ADR-0024 R2 incident evidence/));
}

test('Peter Archer is not counted as a qualifying v7 approval', () => {
  const value = validate();
  const v7 = checkedInV7();
  assert.equal(value.independentReview.satisfied, false);
  assert.equal(value.independentReview.qualifyingApprovalCount, 0);
  assert.equal(value.independentReview.peterArcherCountedAsApproval, false);
  assert.equal(v7.status, 'pending-approval');
  assert.equal(v7.approval.status, 'pending');
  assert.equal(v7.approval.reviewerName, null);
  assert.equal(v7.approval.approvedAt, null);
});

test('Peter Archer statement is retained exactly and only as non-qualifying review', () => {
  const closure = readFileSync(
    'docs/03-engineering/ADR_0024_PRODUCTION_MIGRATION_INCIDENT_EXECUTIVE_RISK_ACCEPTANCE_AND_CLOSURE.md',
    'utf8'
  );
  const exactStatement =
    '“I am happy that the production schema matches the local test database. I have not reviewed the way the data is stored or structured, just that the schemas match - Peter Archer (Software engineer with 6 years experience)”';
  assert.match(closure, new RegExp(exactStatement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(closure, /limited, non-qualifying human review/);
  assert.doesNotMatch(readFileSync(v7Path, 'utf8'), /Peter Archer/);
});

test('Peter Archer cannot be promoted to approval through the closure record', () => {
  assertRiskAcceptanceInvalid((value) => {
    value.independentReview.peterArcherCountedAsApproval = true;
    value.independentReview.qualifyingApprovalCount = 1;
  }, /unfulfilled independent-review state/);
});

test('repository distinguishes technical evidence, pending v7, risk acceptance and closure', () => {
  const value = validate();
  assert.equal(value.binding.r2Evidence.catalogAssertionsVerified, true);
  assert.equal(value.binding.postMigrationAttestation.status, 'pending-approval');
  assert.equal(value.decision.residualGovernanceRiskAccepted, true);
  assert.equal(value.status, 'accepted-and-closed');
});

test('closure introduces no generic runtime bypass', () => {
  const implementation = readFileSync('lib/post-migration-lineage-attestation.ts', 'utf8');
  const record = readFileSync(riskAcceptancePath, 'utf8');
  assert.doesNotMatch(implementation, /BYPASS_GOVERNANCE|process\.env/);
  assert.doesNotMatch(record, /BYPASS_GOVERNANCE/);
  assert.equal(checkedInRiskAcceptance().decision.reusableForAnotherIncident, false);
});

test('CI requires the executive closure record to validate successfully', () => {
  const workflow = readFileSync('.github/workflows/validate.yml', 'utf8');
  const command = readFileSync('scripts/verify-migration-lineage.ts', 'utf8');
  assert.match(workflow, /pnpm db:attestation:verify/);
  assert.match(
    command,
    /adr-0024-production-post-migration-executive-risk-acceptance-v1\.json/
  );
  assert.match(command, /validatePostMigrationExecutiveRiskAcceptance/);
});
