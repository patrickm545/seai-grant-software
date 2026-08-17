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

const baseline = 'da3db4dd71050c902ee2f6266d42fd456e2654cb';
const migrationName = '20260718150000_tenant_first_login_activation';
const recordId = 'e0d71f73-e278-4a79-9906-650a8c43881f';
const canonicalChecksum = 'f704351558f4d253746482b87a65f19e03cc210732d5d6c6f0059e52c8198f6f';
const observedChecksum = '8446029a82124d42544db7799c2116fce1811f1a802e6f2ee722562d798225ab';
const evidenceReference =
  'docs/03-engineering/evidence/ADR_0024_R15_CHECKSUM_DIVERGENCE.json';
const evidenceSha256 = 'b2eac4e30c8871d31668b4b78c2bde40f477ad37ac080e6f4d6c5462d94e0e7d';
const candidateMatrixReference =
  'docs/03-engineering/evidence/ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json';
const candidateMatrixSha256 =
  'af41af8aa3ff53d85afbff1b421a6a599cd7dcab4f7644fde1205b878ae7515f';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const pending = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;
const evidence = JSON.parse(readFileSync(evidenceReference, 'utf8')) as {
  classification: string;
  exactMatch: {
    normalizesByteForByteToCommittedBlob: boolean;
    lineEndingInsertions: number;
  };
  lifecycleReview: { r15ReportedFailureReasons: string[]; separateLifecycleFailureReported: boolean };
};
const candidateMatrix = JSON.parse(readFileSync(candidateMatrixReference, 'utf8')) as {
  notice: string;
  scope: { migrationCount: number };
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
const r15 = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.find(
  (entry) => entry.migrationName === migrationName
)!;
const earlier = PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.filter(
  (entry) =>
    entry.migrationName !== migrationName &&
    entry.migrationName !== '20260720100000_tenant_operator_recovery'
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
        entry.name !== attestation.relatedMigration.name &&
        entry.name !== '20260724180000_password_reset_foundation'
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
    approvedPendingMigrations: ['20260724180000_password_reset_foundation'],
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

test('canonical R15 migration and immutable manifest remain unchanged from the approved baseline', () => {
  execFileSync('git', [
    'diff',
    '--exit-code',
    baseline,
    '--',
    migration.path,
    'prisma/migration-manifest.json'
  ]);
  const committed = execFileSync('git', ['show', `HEAD:${migration.path}`], {
    encoding: 'buffer'
  });
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
      bytes: 575,
      bom: false,
      lineFeeds: 16,
      carriageReturns: 0,
      finalByte: 10,
      checksum: canonicalChecksum,
      manifestChecksum: canonicalChecksum,
      manifestHash: r15.approvedManifestHash
    }
  );
});

test('fresh canonical ledger remains strict and passes without Production exceptions', () => {
  assert.deepEqual(verifyStrictLedger(canonicalRows(), manifest).pending, []);
});

test('exact R15 Production tuple proceeds only through its explicit entry', () => {
  const result = verifyProductionFixture();
  assert.deepEqual(
    result.repositoryChecksumDivergences.find((entry) => entry.migrationName === migrationName),
    {
    migrationName,
    result: 'verified'
    }
  );
  assert.deepEqual(result.pending, ['20260724180000_password_reset_foundation']);
});

test('R10, R11, R12 and R14 tuples cannot satisfy R15', () => {
  assert.equal(earlier.length, 4);
  for (const other of earlier) {
    const fixture = productionFixture();
    const target = migrationRow(fixture.rows, migrationName);
    target.id = other.recordId;
    target.checksum = other.observedProductionChecksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R15 tuple cannot satisfy R10, R11, R12 or R14', () => {
  for (const targetTuple of earlier) {
    const fixture = productionFixture();
    const target = migrationRow(fixture.rows, targetTuple.migrationName);
    target.id = recordId;
    target.checksum = observedChecksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('pilot-auth historical resolved state cannot satisfy ordinary R15', () => {
  const fixture = productionFixture();
  const historical = fixture.attestation.historicalResolvedMigrations[0];
  const target = migrationRow(fixture.rows, migrationName);
  target.id = historical.recordId;
  target.checksum = historical.observedProductionChecksum;
  target.applied_steps_count = historical.expectedAppliedStepsCount;
  assert.throws(() => verifyProductionFixture(fixture));
  assert.equal(historical.expectedAppliedStepsCount, 0);
  assert.equal(r15.expectedLifecycle.appliedStepsCount, 1);
});

test('R15 observed checksum remains rejected by strict Preview and fresh-database verification', () => {
  const rows = canonicalRows();
  migrationRow(rows, migrationName).checksum = observedChecksum;
  assert.throws(() => verifyStrictLedger(rows, manifest));
});

test('R15 tuple fails for another Production fingerprint or wrong record ID', () => {
  const wrongFingerprint = productionFixture();
  wrongFingerprint.attestation.approvedDatabaseFingerprint =
    'db_aaaaaaaaaaaaaaaa' as LineageAttestation['approvedDatabaseFingerprint'];
  assert.throws(() => verifyProductionFixture(wrongFingerprint));

  const wrongRecord = productionFixture();
  migrationRow(wrongRecord.rows, migrationName).id = '33333333-3333-4333-8333-333333333333';
  assert.throws(() => verifyProductionFixture(wrongRecord));
});

test('R15 tuple fails for a wrong observed checksum or one-bit change', () => {
  for (const checksum of ['b'.repeat(64), `${observedChecksum.slice(0, -1)}c`]) {
    const fixture = productionFixture();
    migrationRow(fixture.rows, migrationName).checksum = checksum;
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('R15 tuple fails zero-step, rollback, unfinished and logged lifecycle states', () => {
  const mutations: Array<(target: MigrationLedgerRow) => void> = [
    (target) => {
      target.finished_at = null;
    },
    (target) => {
      target.rolled_back_at = '2026-01-01T00:00:00.000003Z';
    },
    (target) => {
      target.logs = 'unexpected migration log';
    },
    (target) => {
      target.applied_steps_count = 0;
    }
  ];
  for (const mutate of mutations) {
    const fixture = productionFixture();
    mutate(migrationRow(fixture.rows, migrationName));
    assert.throws(() => verifyProductionFixture(fixture));
  }
});

test('missing or altered R15 evidence digest fails attestation validation', () => {
  const missing = structuredClone(pending);
  delete (missing.repositoryMigrationChecksumDivergences[4] as unknown as Record<string, unknown>)
    .checksumEvidenceSha256;
  assert.throws(() => validateLineageAttestation(missing));

  const altered = structuredClone(pending);
  (
    altered.repositoryMigrationChecksumDivergences[4] as unknown as Record<string, unknown>
  ).checksumEvidenceSha256 = 'f'.repeat(64);
  assert.throws(() => validateLineageAttestation(altered));
});

test('candidate matrix remains historical evidence and unobserved candidates remain canonical-only', () => {
  assert.equal(candidateMatrix.scope.migrationCount, 3);
  assert.match(candidateMatrix.notice, /not accepted Production lineage values/);
  assert.equal(candidateMatrix.conclusions.candidateChecksumsAddedToRuntimeVerifier, false);
  assert.equal(candidateMatrix.conclusions.candidateChecksumsAddedToAttestation, false);
  assert.equal(sha256(readFileSync(candidateMatrixReference)), candidateMatrixSha256);
  for (const candidate of candidateMatrix.migrations) {
    assert.equal(candidate.candidate.reverseNormalizationEqualsCanonical, true);
    assert.equal(candidate.candidate.acceptedProductionLineageValue, false);
    const rows = canonicalRows();
    migrationRow(rows, candidate.migrationName).checksum = candidate.candidate.sha256;
    assert.throws(() => verifyStrictLedger(rows, manifest));
  }
  const tenantOperator = candidateMatrix.migrations[0];
  assert.equal(
    PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
      (entry) =>
        entry.migrationName === tenantOperator.migrationName &&
        entry.observedProductionChecksum === tenantOperator.candidate.sha256
    ),
    true
  );
  for (const candidate of candidateMatrix.migrations.slice(1)) {
    assert.equal(
      PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES.some(
        (entry) => entry.observedProductionChecksum === candidate.candidate.sha256
      ),
      false
    );
  }
  const passwordReset = candidateMatrix.migrations.at(-1)!;
  assert.equal(passwordReset.migrationName, '20260724180000_password_reset_foundation');
  assert.equal(passwordReset.productionExpectation, 'pending');
  assert.equal(passwordReset.runtimeTupleAdded, false);
  assert.deepEqual(verifyProductionFixture().pending, [passwordReset.migrationName]);
});

test('no wildcard, pattern, family or automatic CRLF acceptance exists', () => {
  const wildcard = structuredClone(pending);
  (
    wildcard.repositoryMigrationChecksumDivergences[4] as unknown as Record<string, unknown>
  ).migrationName = '20260718*_tenant_first_login_activation';
  assert.throws(() => validateLineageAttestation(wildcard));

  const attestationSource = readFileSync('lib/lineage-attestation.ts', 'utf8');
  const ledgerSource = readFileSync('lib/migration-ledger.ts', 'utf8');
  for (const prohibited of [
    'allowCRLF',
    'acceptWindowsChecksums',
    'acceptedAlternateChecksums',
    'automaticAlternateChecksum'
  ]) {
    assert.doesNotMatch(`${attestationSource}\n${ledgerSource}`, new RegExp(prohibited));
  }
});

test('R15 byte reproduction is deterministic, reversible and semantically unchanged', () => {
  const committed = execFileSync('git', ['show', `HEAD:${migration.path}`], {
    encoding: 'buffer'
  });
  const alternate = Buffer.from(committed.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  const reversed = Buffer.from(alternate.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  assert.equal(alternate.length, 591);
  assert.equal(sha256(alternate), observedChecksum);
  assert.equal((alternate.toString('utf8').match(/\r\n/g) ?? []).length, 16);
  assert.deepEqual(reversed, committed);
  assert.equal(evidence.classification, 'A-exact-alternate-byte-representation-proven');
  assert.deepEqual(evidence.lifecycleReview.r15ReportedFailureReasons, ['checksum-mismatch']);
  assert.equal(evidence.lifecycleReview.separateLifecycleFailureReported, false);
  assert.equal(evidence.exactMatch.lineEndingInsertions, 16);
  assert.equal(evidence.exactMatch.normalizesByteForByteToCommittedBlob, true);
  assert.equal(sha256(readFileSync(evidenceReference)), evidenceSha256);
});

test('pending attestation remains typed exit 21 with zero captures and approvals', () => {
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
  assert.match(result.stdout, /status=pending/);
  assert.equal(validateLineageAttestation(pending).status, 'pending');
  assert.equal(pending.repositoryMigrationChecksumDivergences.length, 6);
  assert.equal(pending.pilotStageCompensatingControl?.captures.length, 0);
  assert.equal(pending.approvals.length, 0);
  assert.throws(
    () => validateLineageAttestation(pending, { requireActive: true }),
    (error: unknown) =>
      error instanceof AttestationValidationError && error.code === 'ATTESTATION_INACTIVE'
  );
});
