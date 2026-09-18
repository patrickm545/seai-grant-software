import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ProductionEvidenceStageError,
  runProductionEvidenceStage,
  safeProductionEvidenceStageDiagnostic
} from '../../lib/production-evidence-diagnostics';

test('stage diagnostics preserve the original exception internally without exposing it', async () => {
  const original = new Error(
    'connection failed for postgresql://operator:super-secret@production.example/clada'
  );

  await assert.rejects(
    () =>
      runProductionEvidenceStage(
        'first-migration-ledger',
        'fixed migration-ledger query returns canonical rows',
        () => {
          throw original;
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof ProductionEvidenceStageError);
      assert.equal(error.stage, 'first-migration-ledger');
      assert.equal(error.invariant, 'fixed migration-ledger query returns canonical rows');
      assert.equal(error.cause, original);

      const diagnostic = safeProductionEvidenceStageDiagnostic(error);
      assert.equal(
        diagnostic,
        'stage=first-migration-ledger; invariant=fixed migration-ledger query returns canonical rows'
      );
      assert.doesNotMatch(diagnostic, /postgres|operator|super-secret|production\.example|clada/i);
      return true;
    }
  );
});

test('nested stage guards retain the first failing stage and cause', async () => {
  const original = new Error('catalog read failed');

  await assert.rejects(
    () =>
      runProductionEvidenceStage(
        'first-transaction',
        'repeatable-read transaction completes without mutation',
        () =>
          runProductionEvidenceStage(
            'first-catalog',
            'fixed public catalog query set returns canonical metadata',
            () => {
              throw original;
            }
          )
      ),
    (error: unknown) => {
      assert.ok(error instanceof ProductionEvidenceStageError);
      assert.equal(error.stage, 'first-catalog');
      assert.equal(error.cause, original);
      return true;
    }
  );
});
