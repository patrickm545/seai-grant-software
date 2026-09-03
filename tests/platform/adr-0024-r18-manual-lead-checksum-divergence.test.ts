import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  AttestationValidationError,
  PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES,
  validateLineageAttestation,
  type LineageAttestation
} from '../../lib/lineage-attestation';
import { verifyStrictLedger } from '../../lib/lineage-verifier';
import { verifyAttestedLedger, type MigrationLedgerRow } from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';
import { pendingLineageAttestationFixture } from './lineage-attestation-fixture';

const baseline = '1fae81c39e4ad70f5083f8562323f7b0c42b754c';
const migrationName = '20260722190000_manual_lead_creation';
const recordId = '5920b218-8952-4f39-9862-3a26465e5cbf';
const canonicalChecksum = '443ebd35fee716599eb70c0df329a68a486f240b7ce179cef0abfec240c75160';
const observedChecksum = '8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e';
const evidenceReference =
  'docs/03-engineering/evidence/ADR_0024_R18_CHECKSUM_DIVERGENCE.json';
const evidenceSha256 = 'd195e7781bfd170721390986e5e143a1d3e0d36525863ce16318cbccc6c85a8f';
const candidateMatrixReference =
  'docs/03-engineering/evidence/ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json';
const candidateMatrixSha256 =
  'af41af8aa3ff53d85afbff1b421a6a599cd7dcab4f7644fde1205b878ae7515f';
const passwordResetMigration = '20260724180000_password_reset_foundation';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = pendingLineageAttestationFixture();
const evidence = JSON.parse(readFileSync(evidenceReference, 'utf8')) as {
  classification: string;
  governingOperation: string;
  repositoryBaseline: string;
  canonical: { byteLength: number; lineFeedCount: number; sha256: string };
  alternate: {
    byteLength: number;
    insertedCarriageReturnCount: number;
    sha256: string;
    matchesObservedProductionChecksum: boolean;
  };
  reversibleEquivalence: {
    reverseNormalizationEqualsCanonicalBytes: boolean;
    sqlTokensChanged: boolean;
    statementOrderChanged: boolean;
    commentsChangedExceptLineEndings: boolean;
    semanticContentChanged: boolean;
  };
  lifecycleReview: {
    r18ReportedFailureReasons: string[];
    structuredReportEvaluatesAllOrdinaryLifecycleFields: boolean;
    separateLifecycleFailureReported: boolean;
    expectedLifecycle: {
      appliedStepsCount: number;
      rolledBackAt: null;
      logsState: string;
      logsDigest: null;
      state: string;
    };
  };
  r18Diagnostic: {
    repositoryExit: number;
    wrapperExit: number;
    reportingStatus: string;
    artifacts: Array<{ reference: string; sha256: string }>;
  };
  candidateMatrix: {
    reference: string;
    sha256: string;
    manualLeadCandidateMatchesR18Observation: boolean;
    runtimeAllowlist: boolean;
    automaticPromotion: boolean;
    remainingUnacceptedCandidates: string[];
  };
  historicalArtifactSearch: {
    allGitObjectDatabaseMatchingBlobCount: number;
    authoritativeApplyingHistoricalBlobRecovered: boolean;
    authoritativeApplyingCheckoutRecovered: boolean;
    authoritativeApplyingCommandRecovered: boolean;
    matchingRetainedWindowsMaterializations: string[];
  };
  repositoryOnlyInvestigation: {
    productionAccessed: boolean;
    productionCommandRun: boolean;
    productionSqlExecuted: boolean;
    productionModified: boolean;
    productionDeploymentOrAliasMovement: boolean;
  };
};
const candidateMatrix = JSON.parse(readFileSync(candidateMatrixReference, 'utf8')) as {
  notice: string;
  migrations: Array<{
    migrationName: string;
    canonical: { sha256: string };
    candidate: {
      byteLength: number;
      insertedCarriageReturnCount: number;
      sha256: string;
      reverseNormalizationEqualsCanonical: boolean;
      acceptedProductionLineageValue: boolean;
    };
    productionExpectation?: string;
    runtimeTupleAdded?: boolean;
  }>;
  conclusions: {
    candidateChecksumsAddedToRuntimeVerifier: boolean;
    candidateChecksumsAddedToAttestation: boolean;
  };
};
const r18 = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
  (entry) => entry.migrationName === migrationName
)!;
const priorTuples = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.filter(
  (entry) => entry.migrationName !== migrationName
);
const migration = manifest.migrations.find((entry) => entry.name === migrationName)!;

function sha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function row(
  input: Partial<MigrationLedgerRow> &
    Pick<MigrationLedgerRow, 'id' | 'migration_name' | 'checksum'>
): MigrationLedgerRow {
  return {
    started_at: '2026-01-01T00:00:00.000001Z',
    finished_at: '2026-01-01T00:00:00.000002Z',
    applied_steps_count: 1,
    rolled_back_at: null,
    logs: null,
    ...input
  };
}

function productionFixture() {
  const attestation = structuredClone(pending);
  const historical = attestation.historicalResolvedMigrations[0];
  const rows = manifest.migrations
    .filter(
      (entry) =>
        entry.name !== attestation.relatedMigration.name && entry.name !== passwordResetMigration
    )
    .map((entry, index) => {
      const divergence = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
        (candidate) => candidate.migrationName === entry.name
      );
      const historicalMatch = historical.migrationName === entry.name;
      return row({
        id:
          divergence?.recordId ??
          (historicalMatch
            ? historical.recordId
            : `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`),
        migration_name: entry.name,
        checksum:
          divergence?.observedProductionChecksum ??
          (historicalMatch ? historical.observedProductionChecksum : entry.checksum),
        applied_steps_count: historicalMatch ? historical.expectedAppliedStepsCount : 1,
        started_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000001Z`,
        finished_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000002Z`
      });
    });
  const failedLog = 'synthetic duplicate-column failure';
  attestation.relatedMigration.failedRecord.id = '11111111-1111-4111-8111-111111111111';
  attestation.relatedMigration.failedRecord.logsDigest = sha256(failedLog);
  attestation.relatedMigration.completedZeroStepRecord.id =
    '22222222-2222-4222-8222-222222222222';
  rows.push(
    row({
      id: attestation.missingMigration.id!,
      migration_name: attestation.missingMigration.migrationName,
      checksum: attestation.missingMigration.checksum,
      started_at: attestation.missingMigration.startedAt,
      finished_at: attestation.missingMigration.finishedAt
    }),
    row({
      id: attestation.relatedMigration.failedRecord.id,
      migration_name: attestation.relatedMigration.name,
      checksum: attestation.relatedMigration.repositoryChecksum,
      started_at: attestation.relatedMigration.failedRecord.startedAt,
      finished_at: null,
      applied_steps_count: 0,
      rolled_back_at: attestation.relatedMigration.failedRecord.rolledBackAt,
      logs: failedLog
    }),
    row({
      id: attestation.relatedMigration.completedZeroStepRecord.id,
      migration_name: attestation.relatedMigration.name,
      checksum: attestation.relatedMigration.repositoryChecksum,
      started_at: attestation.relatedMigration.completedZeroStepRecord.startedAt,
      finished_at: attestation.relatedMigration.completedZeroStepRecord.finishedAt,
      applied_steps_count: 0
    })
  );
  return { attestation, rows, manifest: structuredClone(manifest) };
}

function verifyProductionFixture(fixture = productionFixture()) {
  return verifyAttestedLedger({
    rows: fixture.rows,
    manifest: fixture.manifest,
    attestation: fixture.attestation,
    mode: 'production-status',
    approvedPendingMigrations: [passwordResetMigration],
    historicalResolvedMigrationMode: 'pending-evidence-capture'
  });
}

function migrationRow(rows: MigrationLedgerRow[], name: string) {
  const result = rows.find((candidate) => candidate.migration_name === name);
  assert.ok(result);
  return result;
}

function canonicalRows() {
  return manifest.migrations.map((entry, index) =>
    row({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: entry.name,
      checksum: entry.checksum
    })
  );
}

test('canonical manual-lead migration and immutable manifest remain authoritative', () => {
  execFileSync('git', [
    'diff',
    '--exit-code',
    baseline,
    '--',
    migration.path,
    'prisma/migration-manifest.json'
  ]);
  const committed = execFileSync('git', ['cat-file', 'blob', `HEAD:${migration.path}`]);
  assert.deepEqual(
    {
      bytes: committed.length,
      bom: committed.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
      lineFeeds: committed.toString('utf8').match(/\n/g)?.length,
      carriageReturns: committed.toString('utf8').match(/\r/g)?.length ?? 0,
      finalByte: committed.at(-1),
      checksum: sha256(committed),
      manifestChecksum: migration.checksum,
      manifestHash: manifest.manifestHash
    },
    {
      bytes: 4491,
      bom: false,
      lineFeeds: 112,
      carriageReturns: 0,
      finalByte: 10,
      checksum: canonicalChecksum,
      manifestChecksum: canonicalChecksum,
      manifestHash: r18.approvedManifestHash
    }
  );
});

test('fresh databases retain canonical checksum verification', () => {
  assert.deepEqual(verifyStrictLedger(canonicalRows(), manifest).pending, []);
});

test('exact R18 tuple passes only through its complete pinned Production identity', () => {
  const result = verifyProductionFixture();
  assert.deepEqual(
    result.repositoryChecksumDivergences.find((entry) => entry.migrationName === migrationName),
    { migrationName, result: 'verified' }
  );
  assert.deepEqual(result.pending, [passwordResetMigration]);
  assert.equal(r18.environment, 'production');
  assert.equal(r18.productionDatabaseFingerprint, 'db_4e1d3bd23cff6801');
  assert.equal(r18.recordId, recordId);
  assert.equal(r18.approvedRepositoryLineageBaseline, baseline);
});

test('R18 checksum remains rejected by Preview, Development, test and fresh verification', () => {
  for (const environment of ['preview', 'development', 'test', 'fresh']) {
    const rows = canonicalRows();
    migrationRow(rows, migrationName).checksum = observedChecksum;
    assert.throws(
      () => verifyStrictLedger(rows, manifest),
      `${environment} must remain canonical-only`
    );
  }
});

test('R18 tuple rejects wrong fingerprint, migration and record ID', () => {
  const wrongFingerprint = productionFixture();
  wrongFingerprint.attestation.approvedDatabaseFingerprint =
    'db_aaaaaaaaaaaaaaaa' as LineageAttestation['approvedDatabaseFingerprint'];
  assert.throws(() => verifyProductionFixture(wrongFingerprint));

  const wrongMigration = productionFixture();
  migrationRow(wrongMigration.rows, migrationName).migration_name = '20260722190001_wrong';
  assert.throws(() => verifyProductionFixture(wrongMigration));

  const wrongRecord = productionFixture();
  migrationRow(wrongRecord.rows, migrationName).id = '33333333-3333-4333-8333-333333333333';
  assert.throws(() => verifyProductionFixture(wrongRecord));
});

test('R18 tuple rejects wrong canonical, observed and one-bit checksums', () => {
  const wrongCanonical = productionFixture();
  wrongCanonical.manifest.migrations.find((item) => item.name === migrationName)!.checksum =
    'f'.repeat(64);
  assert.throws(() => verifyProductionFixture(wrongCanonical));

  for (const checksum of ['b'.repeat(64), `${observedChecksum.slice(0, -1)}f`]) {
    const fixture = productionFixture();
    migrationRow(fixture.rows, migrationName).checksum = checksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R18 tuple rejects zero or multiple steps, unfinished, rollback and logs', () => {
  const mutations: Array<(target: MigrationLedgerRow) => void> = [
    (target) => {
      target.applied_steps_count = 0;
    },
    (target) => {
      target.applied_steps_count = 2;
    },
    (target) => {
      target.finished_at = null;
    },
    (target) => {
      target.rolled_back_at = '2026-01-01T00:00:00.000003Z';
    },
    (target) => {
      target.logs = 'unexpected migration log';
    }
  ];
  for (const mutate of mutations) {
    const fixture = productionFixture();
    mutate(migrationRow(fixture.rows, migrationName));
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R18 evidence digest and repository baseline are independently pinned', () => {
  const alteredDigest = structuredClone(pending);
  (
    alteredDigest.repositoryMigrationChecksumDivergences[6] as unknown as Record<string, unknown>
  ).checksumEvidenceSha256 = 'a'.repeat(64);
  assert.throws(() => validateLineageAttestation(alteredDigest));

  const alteredBaseline = structuredClone(pending);
  (
    alteredBaseline.repositoryMigrationChecksumDivergences[6] as unknown as Record<string, unknown>
  ).approvedRepositoryLineageBaseline = 'a'.repeat(40);
  assert.throws(() => validateLineageAttestation(alteredBaseline));
});

test('tuples 1 through 6 cannot satisfy R18 and R18 cannot satisfy them', () => {
  assert.equal(priorTuples.length, 6);
  for (const other of priorTuples) {
    const asR18 = productionFixture();
    const r18Row = migrationRow(asR18.rows, migrationName);
    r18Row.id = other.recordId;
    r18Row.checksum = other.observedProductionChecksum;
    assert.throws(() => verifyProductionFixture(asR18));

    const asPrior = productionFixture();
    const priorRow = migrationRow(asPrior.rows, other.migrationName);
    priorRow.id = recordId;
    priorRow.checksum = observedChecksum;
    assert.throws(() => verifyProductionFixture(asPrior));
  }
});

test('pilot-auth historical resolved state cannot satisfy ordinary R18', () => {
  const fixture = productionFixture();
  const historical = fixture.attestation.historicalResolvedMigrations[0];
  const target = migrationRow(fixture.rows, migrationName);
  target.id = historical.recordId;
  target.checksum = historical.observedProductionChecksum;
  target.applied_steps_count = historical.expectedAppliedStepsCount;
  assert.throws(() => verifyProductionFixture(fixture));
  assert.equal(historical.expectedAppliedStepsCount, 0);
  assert.equal(r18.expectedLifecycle.appliedStepsCount, 1);
});

test('password-reset candidate remains unaccepted and pending', () => {
  const passwordReset = candidateMatrix.migrations.find(
    (item) => item.migrationName === passwordResetMigration
  )!;
  assert.equal(passwordReset.productionExpectation, 'pending');
  assert.equal(passwordReset.runtimeTupleAdded, false);
  assert.equal(passwordReset.candidate.acceptedProductionLineageValue, false);
  assert.equal(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (entry) => String(entry.migrationName) === passwordResetMigration
    ),
    false
  );
  const strictRows = canonicalRows();
  migrationRow(strictRows, passwordResetMigration).checksum = passwordReset.candidate.sha256;
  assert.throws(() => verifyStrictLedger(strictRows, manifest));
  assert.deepEqual(verifyProductionFixture().pending, [passwordResetMigration]);
});

test('candidate matrix creates no verifier acceptance or automatic promotion', () => {
  const manualLead = candidateMatrix.migrations.find((item) => item.migrationName === migrationName)!;
  assert.match(candidateMatrix.notice, /not accepted Production lineage values/);
  assert.equal(candidateMatrix.conclusions.candidateChecksumsAddedToRuntimeVerifier, false);
  assert.equal(candidateMatrix.conclusions.candidateChecksumsAddedToAttestation, false);
  assert.equal(manualLead.candidate.acceptedProductionLineageValue, false);
  assert.equal(manualLead.candidate.sha256, observedChecksum);
  assert.equal(sha256(readFileSync(candidateMatrixReference)), candidateMatrixSha256);
  assert.equal(evidence.candidateMatrix.runtimeAllowlist, false);
  assert.equal(evidence.candidateMatrix.automaticPromotion, false);
  assert.deepEqual(evidence.candidateMatrix.remainingUnacceptedCandidates, [passwordResetMigration]);
  assert.equal(r18.checksumEvidenceReference, evidenceReference);

  const ledgerSource = readFileSync('lib/migration-ledger.ts', 'utf8');
  assert.doesNotMatch(ledgerSource, /REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15/);
});

test('no wildcard, checksum family or generic CRLF acceptance exists', () => {
  const wildcard = structuredClone(pending);
  (
    wildcard.repositoryMigrationChecksumDivergences[6] as unknown as Record<string, unknown>
  ).migrationName = '20260722*_manual_lead_creation';
  assert.throws(() => validateLineageAttestation(wildcard));

  const source = `${readFileSync('lib/lineage-attestation.ts', 'utf8')}\n${readFileSync(
    'lib/migration-ledger.ts',
    'utf8'
  )}`;
  for (const prohibited of [
    'allowCRLF',
    'acceptWindowsChecksums',
    'acceptedAlternateChecksums',
    'automaticAlternateChecksum',
    'migrationPrefixRule',
    'migrationDateRule'
  ]) {
    assert.doesNotMatch(source, new RegExp(prohibited));
  }
});

test('R18 byte proof is exact, reversible and semantically unchanged', () => {
  const committed = execFileSync('git', ['cat-file', 'blob', `HEAD:${migration.path}`]);
  const alternate = Buffer.from(committed.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  const reversed = Buffer.from(alternate.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  assert.equal(alternate.length, 4603);
  assert.equal(sha256(alternate), observedChecksum);
  assert.equal((alternate.toString('utf8').match(/\r\n/g) ?? []).length, 112);
  assert.deepEqual(reversed, committed);
  assert.equal(evidence.classification, 'A-exact-alternate-byte-representation-proven');
  assert.equal(evidence.governingOperation, 'CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R18');
  assert.equal(evidence.repositoryBaseline, baseline);
  assert.equal(evidence.canonical.byteLength, 4491);
  assert.equal(evidence.canonical.lineFeedCount, 112);
  assert.equal(evidence.canonical.sha256, canonicalChecksum);
  assert.equal(evidence.alternate.byteLength, 4603);
  assert.equal(evidence.alternate.insertedCarriageReturnCount, 112);
  assert.equal(evidence.alternate.sha256, observedChecksum);
  assert.equal(evidence.alternate.matchesObservedProductionChecksum, true);
  assert.equal(evidence.reversibleEquivalence.reverseNormalizationEqualsCanonicalBytes, true);
  assert.equal(evidence.reversibleEquivalence.sqlTokensChanged, false);
  assert.equal(evidence.reversibleEquivalence.statementOrderChanged, false);
  assert.equal(evidence.reversibleEquivalence.commentsChangedExceptLineEndings, false);
  assert.equal(evidence.reversibleEquivalence.semanticContentChanged, false);
});

test('R18 lifecycle, diagnostic, historical search and repository-only boundary are exact', () => {
  assert.deepEqual(evidence.lifecycleReview.r18ReportedFailureReasons, ['checksum-mismatch']);
  assert.equal(evidence.lifecycleReview.structuredReportEvaluatesAllOrdinaryLifecycleFields, true);
  assert.equal(evidence.lifecycleReview.separateLifecycleFailureReported, false);
  assert.deepEqual(evidence.lifecycleReview.expectedLifecycle, {
    startedAt: 'present-valid-canonical-utc-timestamp',
    finishedAt: 'present-valid-canonical-utc-timestamp',
    appliedStepsCount: 1,
    rolledBackAt: null,
    logsState: 'none',
    logsDigest: null,
    state: 'finished-not-rolled-back'
  });
  assert.equal(evidence.r18Diagnostic.repositoryExit, 25);
  assert.equal(evidence.r18Diagnostic.wrapperExit, 25);
  assert.equal(evidence.r18Diagnostic.reportingStatus, 'complete');
  assert.equal(evidence.r18Diagnostic.artifacts.length, 7);
  assert.equal(evidence.historicalArtifactSearch.allGitObjectDatabaseMatchingBlobCount, 0);
  assert.equal(evidence.historicalArtifactSearch.authoritativeApplyingHistoricalBlobRecovered, false);
  assert.equal(evidence.historicalArtifactSearch.authoritativeApplyingCheckoutRecovered, false);
  assert.equal(evidence.historicalArtifactSearch.authoritativeApplyingCommandRecovered, false);
  assert.equal(evidence.historicalArtifactSearch.matchingRetainedWindowsMaterializations.length, 3);
  assert.deepEqual(evidence.repositoryOnlyInvestigation, {
    productionAccessed: false,
    productionCommandRun: false,
    productionSqlExecuted: false,
    productionModified: false,
    productionDeploymentOrAliasMovement: false
  });
  assert.equal(sha256(readFileSync(evidenceReference)), evidenceSha256);
  assert.equal(evidence.candidateMatrix.reference, candidateMatrixReference);
  assert.equal(evidence.candidateMatrix.sha256, candidateMatrixSha256);
  assert.equal(evidence.candidateMatrix.manualLeadCandidateMatchesR18Observation, true);
});

test('checked-in attestation is retired while pending seven-tuple fixture remains fail closed', () => {
  const offlineEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !/^(?:DATABASE_URL|DATABASE_|PRODUCTION_DATABASE_|PREVIEW_DATABASE_|TEST_DATABASE_|NEON_)/.test(
          key
        )
    )
  );
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/verify-migration-lineage.ts', 'attestation-verify'],
    { encoding: 'utf8', env: { ...offlineEnvironment, NODE_ENV: 'test' } }
  );
  assert.equal(result.status, 21, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /status=retired/);
  assert.equal(validateLineageAttestation(pending).status, 'pending');
  assert.equal(pending.repositoryMigrationChecksumDivergences.length, 7);
  assert.equal(pending.pilotStageCompensatingControl?.captures.length, 0);
  assert.equal(pending.approvals.length, 0);
  assert.throws(
    () => validateLineageAttestation(pending, { requireActive: true }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_INACTIVE'
  );
});
