import { readFileSync } from 'node:fs';
import type { LineageAttestation } from '../../lib/lineage-attestation';

export function checkedInLineageAttestation() {
  return JSON.parse(
    readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
  ) as LineageAttestation;
}

export function pendingLineageAttestationFixture() {
  const value = structuredClone(checkedInLineageAttestation());
  value.status = 'pending';
  value.reviewedAt = null;
  value.expiresAt = null;
  value.evidenceReferences = value.evidenceReferences.filter(
    (reference) =>
      ![
        'docs/03-engineering/PR_45_ADR_0024_PRODUCTION_EVIDENCE_R19.md',
        'docs/03-engineering/PR_45_ADR_0024_R4_POST_MIGRATION_SCHEMA_FINGERPRINT_INVESTIGATION.md'
      ].includes(reference)
  );

  const historical = value.historicalResolvedMigrations[0];
  historical.exactLedgerTimestamps.startedAt = null;
  historical.exactLedgerTimestamps.finishedAt = null;
  historical.observedCurrentSchema.fingerprint = null;
  historical.observedCurrentSchema.catalogAssertionsDigest = null;
  historical.observedCurrentSchema.evidenceReference = null;
  historical.observedCurrentSchema.evidenceSha256 = null;
  historical.r14Evidence.changeId = null;
  historical.r14Evidence.repositoryRevision = null;
  historical.r14Evidence.captureArtifactReferences = [];
  historical.r14Evidence.captureArtifactSha256s = [];
  historical.r14Evidence.recoveryEvidenceReference = null;

  value.relatedMigration.failedRecord.id = null;
  value.relatedMigration.failedRecord.logsDigest = null;
  value.relatedMigration.completedZeroStepRecord.id = null;
  value.schema.preMigrationFingerprint = null;
  value.schema.postMigrationFingerprint = null;
  value.schema.postMigrationEvidence = null;
  value.schema.freshHeadFingerprint = null;

  const pilot = value.pilotStageCompensatingControl!;
  pilot.activatedAt = null;
  pilot.captures = [];
  pilot.repeatedDeterministicFieldsMatch = null;
  value.approvals = [];
  return value;
}
