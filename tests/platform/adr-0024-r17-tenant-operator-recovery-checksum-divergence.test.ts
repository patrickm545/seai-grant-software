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

const baseline = '0762b5eb93c1ac1ac9909507bff4638ac0aa8b04';
const migrationName = '20260720100000_tenant_operator_recovery';
const recordId = '4c2d5692-de53-4156-84da-eff6184f9c1d';
const canonicalChecksum = 'e32cb837f4bd9055554080ae4261e2040f13974b2fed72de1008f881a95f3215';
const observedChecksum = '11f3b33fd9189ffa549fac4c0a66a9705c6a26e6420bc0d42cdf572aa7ed8f96';
const evidenceReference =
  'docs/03-engineering/evidence/ADR_0024_R17_CHECKSUM_DIVERGENCE.json';
const evidenceSha256 = 'c45a5290b897a408981a0a124ab7f08ac26ac05a874e12d7a58307fc5d72b2b6';
const candidateMatrixReference =
  'docs/03-engineering/evidence/ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json';
const candidateMatrixSha256 =
  'af41af8aa3ff53d85afbff1b421a6a599cd7dcab4f7644fde1205b878ae7515f';
const manualLeadMigration = '20260722190000_manual_lead_creation';
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
    r17ReportedFailureReasons: string[];
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
  r17Diagnostic: {
    repositoryExit: number;
    wrapperExit: number;
    reportingStatus: string;
    artifacts: Array<{ reference: string; sha256: string }>;
  };
  candidateMatrix: {
    reference: string;
    sha256: string;
    tenantOperatorCandidateMatchesR17Observation: boolean;
    runtimeAllowlist: boolean;
    automaticPromotion: boolean;
    remainingUnacceptedCandidates: string[];
  };
};
const candidateMatrix = JSON.parse(readFileSync(candidateMatrixReference, 'utf8')) as {
  notice: string;
  migrations: Array<{
    migrationName: string;
    canonical: { sha256: string };
    candidate: {
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
const r17 = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
  (entry) => entry.migrationName === migrationName
)!;
const priorTuples = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.filter(
  (entry) =>
    entry.migrationName !== migrationName &&
    entry.migrationName !== '20260722190000_manual_lead_creation'
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

test('canonical tenant operator recovery migration and manifest remain authoritative', () => {
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
      bytes: 804,
      bom: false,
      lineFeeds: 24,
      carriageReturns: 0,
      finalByte: 10,
      checksum: canonicalChecksum,
      manifestChecksum: canonicalChecksum,
      manifestHash: r17.approvedManifestHash
    }
  );
});

test('fresh databases use canonical checksums without Production exceptions', () => {
  assert.deepEqual(verifyStrictLedger(canonicalRows(), manifest).pending, []);
});

test('exact R17 tuple passes only through its exact Production entry', () => {
  const result = verifyProductionFixture();
  assert.deepEqual(
    result.repositoryChecksumDivergences.find((entry) => entry.migrationName === migrationName),
    {
      migrationName,
      result: 'verified'
    }
  );
  assert.deepEqual(result.pending, [passwordResetMigration]);
  assert.equal(r17.environment, 'production');
  assert.equal(r17.productionDatabaseFingerprint, 'db_4e1d3bd23cff6801');
});

test('R17 observed checksum fails strict Preview, Development and test verification', () => {
  for (const environment of ['preview', 'development', 'test']) {
    const rows = canonicalRows();
    migrationRow(rows, migrationName).checksum = observedChecksum;
    assert.throws(
      () => verifyStrictLedger(rows, manifest),
      `${environment} must remain canonical-only`
    );
  }
});

test('R17 tuple fails another Production fingerprint and wrong record identity', () => {
  const wrongFingerprint = productionFixture();
  wrongFingerprint.attestation.approvedDatabaseFingerprint =
    'db_aaaaaaaaaaaaaaaa' as LineageAttestation['approvedDatabaseFingerprint'];
  assert.throws(() => verifyProductionFixture(wrongFingerprint));

  const wrongRecord = productionFixture();
  migrationRow(wrongRecord.rows, migrationName).id = '33333333-3333-4333-8333-333333333333';
  assert.throws(() => verifyProductionFixture(wrongRecord));
});

test('R17 tuple fails wrong canonical, observed and one-bit checksums', () => {
  const wrongCanonical = productionFixture();
  const entry = wrongCanonical.manifest.migrations.find((item) => item.name === migrationName)!;
  entry.checksum = 'f'.repeat(64);
  assert.throws(() => verifyProductionFixture(wrongCanonical));

  for (const checksum of ['b'.repeat(64), `${observedChecksum.slice(0, -1)}7`]) {
    const fixture = productionFixture();
    migrationRow(fixture.rows, migrationName).checksum = checksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R17 tuple fails zero-step, rollback, unfinished and logged lifecycle states', () => {
  const mutations: Array<(target: MigrationLedgerRow) => void> = [
    (target) => {
      target.applied_steps_count = 0;
    },
    (target) => {
      target.rolled_back_at = '2026-01-01T00:00:00.000003Z';
    },
    (target) => {
      target.finished_at = null;
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

test('R10, R11, R12, R14 and R15 cannot satisfy R17', () => {
  assert.equal(priorTuples.length, 5);
  for (const other of priorTuples) {
    const fixture = productionFixture();
    const target = migrationRow(fixture.rows, migrationName);
    target.id = other.recordId;
    target.checksum = other.observedProductionChecksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R17 cannot satisfy R10, R11, R12, R14 or R15', () => {
  for (const targetTuple of priorTuples) {
    const fixture = productionFixture();
    const target = migrationRow(fixture.rows, targetTuple.migrationName);
    target.id = recordId;
    target.checksum = observedChecksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('pilot-auth historical state cannot satisfy ordinary R17', () => {
  const fixture = productionFixture();
  const historical = fixture.attestation.historicalResolvedMigrations[0];
  const target = migrationRow(fixture.rows, migrationName);
  target.id = historical.recordId;
  target.checksum = historical.observedProductionChecksum;
  target.applied_steps_count = historical.expectedAppliedStepsCount;
  assert.throws(() => verifyProductionFixture(fixture));
  assert.equal(historical.expectedAppliedStepsCount, 0);
  assert.equal(r17.expectedLifecycle.appliedStepsCount, 1);
});

test('manual-lead and password-reset candidates remain strict-only while only R18 pins manual lead', () => {
  for (const name of [manualLeadMigration, passwordResetMigration]) {
    const candidate = candidateMatrix.migrations.find((item) => item.migrationName === name)!;
    assert.equal(candidate.candidate.acceptedProductionLineageValue, false);
    const rows = canonicalRows();
    migrationRow(rows, name).checksum = candidate.candidate.sha256;
    assert.throws(() => verifyStrictLedger(rows, manifest));
  }
  const manualLead = candidateMatrix.migrations.find(
    (item) => item.migrationName === manualLeadMigration
  )!;
  assert.equal(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (entry) =>
        entry.migrationName === manualLeadMigration &&
        entry.observedProductionChecksum === manualLead.candidate.sha256
    ),
    true
  );
  const passwordReset = candidateMatrix.migrations.find(
    (item) => item.migrationName === passwordResetMigration
  )!;
  assert.equal(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (entry) => entry.observedProductionChecksum === passwordReset.candidate.sha256
    ),
    false
  );
});

test('password reset remains pending and has no attested tuple', () => {
  const passwordReset = candidateMatrix.migrations.find(
    (item) => item.migrationName === passwordResetMigration
  )!;
  assert.equal(passwordReset.productionExpectation, 'pending');
  assert.equal(passwordReset.runtimeTupleAdded, false);
  assert.equal(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (entry) => String(entry.migrationName) === passwordResetMigration
    ),
    false
  );
  assert.deepEqual(verifyProductionFixture().pending, [passwordResetMigration]);
});

test('candidate matrix is not a runtime allowlist and cannot promote automatically', () => {
  assert.match(candidateMatrix.notice, /not accepted Production lineage values/);
  assert.equal(candidateMatrix.conclusions.candidateChecksumsAddedToRuntimeVerifier, false);
  assert.equal(candidateMatrix.conclusions.candidateChecksumsAddedToAttestation, false);
  assert.equal(sha256(readFileSync(candidateMatrixReference)), candidateMatrixSha256);
  assert.equal(evidence.candidateMatrix.runtimeAllowlist, false);
  assert.equal(evidence.candidateMatrix.automaticPromotion, false);
  assert.deepEqual(evidence.candidateMatrix.remainingUnacceptedCandidates, [
    manualLeadMigration,
    passwordResetMigration
  ]);

  const ledgerSource = readFileSync('lib/migration-ledger.ts', 'utf8');
  assert.doesNotMatch(ledgerSource, /REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15/);
});

test('no wildcard, checksum family or generic CRLF acceptance exists', () => {
  const wildcard = structuredClone(pending);
  (
    wildcard.repositoryMigrationChecksumDivergences[5] as unknown as Record<string, unknown>
  ).migrationName = '20260720*_tenant_operator_recovery';
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

test('R17 byte proof is exact, reversible and semantically unchanged', () => {
  const committed = execFileSync('git', ['cat-file', 'blob', `HEAD:${migration.path}`]);
  const alternate = Buffer.from(committed.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  const reversed = Buffer.from(alternate.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  assert.equal(alternate.length, 828);
  assert.equal(sha256(alternate), observedChecksum);
  assert.equal((alternate.toString('utf8').match(/\r\n/g) ?? []).length, 24);
  assert.deepEqual(reversed, committed);
  assert.equal(evidence.classification, 'A-exact-alternate-byte-representation-proven');
  assert.equal(evidence.governingOperation, 'CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R17');
  assert.equal(evidence.repositoryBaseline, baseline);
  assert.equal(evidence.canonical.byteLength, 804);
  assert.equal(evidence.canonical.lineFeedCount, 24);
  assert.equal(evidence.canonical.sha256, canonicalChecksum);
  assert.equal(evidence.alternate.byteLength, 828);
  assert.equal(evidence.alternate.insertedCarriageReturnCount, 24);
  assert.equal(evidence.alternate.sha256, observedChecksum);
  assert.equal(evidence.alternate.matchesObservedProductionChecksum, true);
  assert.equal(evidence.reversibleEquivalence.reverseNormalizationEqualsCanonicalBytes, true);
  assert.equal(evidence.reversibleEquivalence.sqlTokensChanged, false);
  assert.equal(evidence.reversibleEquivalence.statementOrderChanged, false);
  assert.equal(evidence.reversibleEquivalence.commentsChangedExceptLineEndings, false);
  assert.equal(evidence.reversibleEquivalence.semanticContentChanged, false);
});

test('R17 lifecycle and retained diagnostic evidence are exact', () => {
  assert.deepEqual(evidence.lifecycleReview.r17ReportedFailureReasons, ['checksum-mismatch']);
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
  assert.equal(evidence.r17Diagnostic.repositoryExit, 25);
  assert.equal(evidence.r17Diagnostic.wrapperExit, 25);
  assert.equal(evidence.r17Diagnostic.reportingStatus, 'complete');
  assert.equal(evidence.r17Diagnostic.artifacts.length, 7);
  assert.equal(sha256(readFileSync(evidenceReference)), evidenceSha256);
  assert.equal(evidence.candidateMatrix.reference, candidateMatrixReference);
  assert.equal(evidence.candidateMatrix.sha256, candidateMatrixSha256);
  assert.equal(evidence.candidateMatrix.tenantOperatorCandidateMatchesR17Observation, true);
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
