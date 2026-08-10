import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getDatabaseIdentity } from '../../lib/database-safety';
import {
  PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES
} from '../../lib/lineage-attestation';
import {
  exitCodeFor,
  LineageVerifierError,
  VERIFIER_EXIT_CODES,
  verifyLineage
} from '../../lib/lineage-verifier';
import type { MigrationLedgerRow } from '../../lib/migration-ledger';
import type { MigrationManifest } from '../../lib/migration-manifest';
import {
  classifyStrictVerifierFailure,
  runStrictVerifierStage,
  safeStrictVerifierStageDiagnostic,
  StrictVerifierStageError
} from '../../lib/strict-verifier-diagnostics';
import { acceptedVerifierExitCodes, classifyVerifierExit } from '../../lib/verifier-command-policy';
import { activeAttestation } from './lineage-attestation.test';
import { preMigrationCatalog } from './schema-fingerprint.test';

const manifest = JSON.parse(
  readFileSync('prisma/migration-manifest.json', 'utf8')
) as MigrationManifest;
const commandSource = readFileSync('scripts/verify-migration-lineage.ts', 'utf8');
const databaseCommandSource = readFileSync('scripts/run-database-command.ts', 'utf8');

function canonicalPreviewRows(): MigrationLedgerRow[] {
  return manifest.migrations
    .filter((migration) => migration.name !== '20260724180000_password_reset_foundation')
    .map((migration, index) => ({
      id: `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
      migration_name: migration.name,
      checksum: migration.checksum,
      started_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000001Z`,
      finished_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000002Z`,
      applied_steps_count: 1,
      rolled_back_at: null,
      logs: null
    }));
}

function strictInput(overrides: Partial<Parameters<typeof verifyLineage>[0]> = {}) {
  return {
    mode: 'strict-preflight' as const,
    environment: 'preview',
    identity: getDatabaseIdentity('postgresql://role:secret@preview.example/preview'),
    connectedDatabaseName: 'preview',
    repositoryBaseline: 'ad8ce2c263c8e8533fd0b71af0d8f82513936a26',
    manifest,
    ledgerRows: canonicalPreviewRows(),
    catalog: preMigrationCatalog(),
    now: new Date('2026-08-10T12:00:00.000Z'),
    ...overrides
  } satisfies Parameters<typeof verifyLineage>[0];
}

test('Preview strict-preflight remains canonical-only', () => {
  const evidence = verifyLineage(strictInput());
  assert.equal(evidence.finalDecision, 'verified-clean');
  assert.equal(evidence.attestedDiscrepancy, 'not-applicable');
  assert.equal(evidence.attestedRepositoryChecksumDivergence, 'not-applicable');
  assert.deepEqual(evidence.attestedRepositoryChecksumDivergences, []);
});

test('exact Production checksum tuples cannot cross into Preview', () => {
  for (const divergence of PRODUCTION_REPOSITORY_CHECKSUM_DIVERGENCES) {
    const ledgerRows = canonicalPreviewRows();
    ledgerRows.find((row) => row.migration_name === divergence.migrationName)!.checksum =
      divergence.observedProductionChecksum;
    assert.throws(
      () => verifyLineage(strictInput({ ledgerRows, attestation: activeAttestation() })),
      (error: unknown) =>
        error instanceof LineageVerifierError &&
        error.code === 'LEDGER_MISMATCH' &&
        exitCodeFor(error) === VERIFIER_EXIT_CODES.LEDGER_MISMATCH
    );
  }
});

test('attestation v5 historical state does not alter Preview acceptance', () => {
  const withoutAttestation = verifyLineage(strictInput());
  const withAttestation = verifyLineage(strictInput({ attestation: activeAttestation() }));
  assert.deepEqual(withAttestation, withoutAttestation);
});

test('expected Preview ledger mismatch returns typed exit 25', () => {
  const ledgerRows = canonicalPreviewRows();
  ledgerRows[0].checksum = 'f'.repeat(64);
  assert.throws(
    () => verifyLineage(strictInput({ ledgerRows })),
    (error: unknown) =>
      error instanceof LineageVerifierError &&
      error.code === 'LEDGER_MISMATCH' &&
      exitCodeFor(error) === 25
  );
});

test('known Preview ledger normalization mismatch returns typed exit 25', () => {
  const ledgerRows = canonicalPreviewRows();
  ledgerRows[0].started_at = 'not-a-canonical-timestamp';
  assert.throws(
    () => verifyLineage(strictInput({ ledgerRows })),
    (error: unknown) => {
      assert.ok(error instanceof LineageVerifierError);
      assert.equal(error.code, 'LEDGER_MISMATCH');
      assert.equal(exitCodeFor(error), 25);
      assert.match(error.message, /field=startedAt/);
      assert.match(error.message, /reason=non-canonical-timestamp/);
      return true;
    }
  );
});

test('typed Preview mismatch receives a typed safe stage classification', async () => {
  const typed = new LineageVerifierError('LEDGER_MISMATCH', 'safe ledger mismatch');
  await assert.rejects(
    () =>
      runStrictVerifierStage(
        'strict-lineage-verification',
        'canonical verification completes',
        () => {
          throw typed;
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof StrictVerifierStageError);
      assert.deepEqual(classifyStrictVerifierFailure(error.cause), {
        category: 'typed-verifier-failure',
        errorCode: null
      });
      assert.match(
        safeStrictVerifierStageDiagnostic(error),
        /category=typed-verifier-failure; errorCode=none/
      );
      return true;
    }
  );
});

test('expected Preview schema mismatch returns typed exit 26', () => {
  const catalog = preMigrationCatalog();
  catalog.columns[0].nullable = !catalog.columns[0].nullable;
  assert.throws(
    () => verifyLineage(strictInput({ catalog })),
    (error: unknown) =>
      error instanceof LineageVerifierError &&
      error.code === 'SCHEMA_MISMATCH' &&
      exitCodeFor(error) === 26
  );
});

test('genuine internal failure retains its cause and exit 70', async () => {
  const original = new Error('unexpected runtime failure');
  await assert.rejects(
    () =>
      runStrictVerifierStage(
        'strict-lineage-verification',
        'canonical verification completes',
        () => {
          throw original;
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof StrictVerifierStageError);
      assert.equal(error.cause, original);
      assert.equal(exitCodeFor(error.cause), 70);
      return true;
    }
  );
});

test('safe stage diagnostic classifies Prisma connectivity without exposing secrets', async () => {
  const original = Object.assign(
    new Error('postgresql://operator:credential@secret.example/preview'),
    { code: 'P1001' }
  );
  await assert.rejects(
    () =>
      runStrictVerifierStage(
        'strict-transaction',
        'guarded database connection opens',
        () => {
          throw original;
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof StrictVerifierStageError);
      assert.deepEqual(classifyStrictVerifierFailure(error.cause), {
        category: 'database-unreachable',
        errorCode: 'P1001'
      });
      const diagnostic = safeStrictVerifierStageDiagnostic(error);
      assert.match(diagnostic, /stage=strict-transaction/);
      assert.match(diagnostic, /category=database-unreachable; errorCode=P1001/);
      assert.doesNotMatch(
        diagnostic,
        /postgres|operator|credential|secret\.example|preview/i
      );
      return true;
    }
  );
});

test('unknown secret-bearing exception remains generic and secret-free', async () => {
  await assert.rejects(
    () =>
      runStrictVerifierStage(
        'strict-catalog',
        'fixed catalog query set returns canonical metadata',
        () => {
          throw new Error('token=secret-value at postgresql://role:password@host/database');
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof StrictVerifierStageError);
      const diagnostic = safeStrictVerifierStageDiagnostic(error);
      assert.match(diagnostic, /category=unexpected-internal-error; errorCode=none/);
      assert.doesNotMatch(
        diagnostic,
        /token=|secret-value|postgres(?:ql)?:\/\/|role:password|host\/database/i
      );
      return true;
    }
  );
});

test('strict-preflight remains fail-closed and deploy stays unreachable after verifier failure', () => {
  assert.deepEqual(acceptedVerifierExitCodes('strict-preflight'), [0]);
  for (const exitCode of [20, 21, 23, 24, 25, 26, 27, 70]) {
    assert.deepEqual(classifyVerifierExit('strict-preflight', exitCode), {
      kind: 'unsafe-failure',
      exitCode
    });
  }
  const preflight = databaseCommandSource.indexOf("runVerifier('preflight')");
  const deploy = databaseCommandSource.indexOf("if (definition.prismaArgs) run('prisma'");
  assert.ok(preflight > 0 && deploy > preflight);
  const verifierFunction = databaseCommandSource.slice(
    databaseCommandSource.indexOf('function runVerifier'),
    databaseCommandSource.indexOf("if (definition.operation === 'migration-status')")
  );
  assert.match(verifierFunction, /decision\.kind === 'unsafe-failure'/);
  assert.match(verifierFunction, /process\.exit\(decision\.exitCode\)/);
  assert.match(commandSource, /const attestation = productionMode/);
  assert.match(commandSource, /productionMode\s*\? await readDatabaseState\(\)/);
});
