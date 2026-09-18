import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFixedProductionEvidenceOperationWithRetention } from '../lib/production-evidence-operation-retention';

if (process.argv.length !== 2) {
  console.error('RETENTION_SMOKE_UNSAFE: this command accepts no arguments.');
  process.exit(1);
}

const artifactBase = mkdtempSync(join(tmpdir(), 'adr0024-retention-smoke-'));
const changeId = 'CHG-2099-01-01-ADR0024-PROD-EVIDENCE-R99';
const diagnostic = Buffer.from(
  'LEDGER_MISMATCH: stage=synthetic-smoke; invariant=retention-is-write-first; safe diagnostic\n',
  'utf8'
);
let launches = 0;

try {
  const result = runFixedProductionEvidenceOperationWithRetention({
    artifactBaseDirectory: artifactBase,
    environment: {
      NODE_ENV: 'test',
      PRODUCTION_EVIDENCE_CHANGE_ID: changeId
    },
    repositoryRevision: () => 'a'.repeat(40),
    launch: () => {
      launches += 1;
      return {
        status: 25,
        signal: null,
        stdout: Buffer.alloc(0),
        stderr: diagnostic
      };
    }
  });
  const operationDirectory = join(artifactBase, changeId);
  const retained = readFileSync(join(operationDirectory, 'child-stderr.bin'));
  const boundary = JSON.parse(
    readFileSync(join(operationDirectory, 'operation-boundary.json'), 'utf8')
  ) as Record<string, unknown>;
  assert.equal(launches, 1);
  assert.equal(result.repositoryExit, 25);
  assert.equal(result.wrapperExit, 25);
  assert.equal(result.reportingStatus, 'complete');
  assert.deepEqual(retained, diagnostic);
  assert.equal(
    (boundary.stderr as Record<string, string>).sha256,
    createHash('sha256').update(diagnostic).digest('hex')
  );
  process.stdout.write('retention OK\n');
} catch {
  console.error('RETENTION_SMOKE_FAILED');
  process.exitCode = 1;
} finally {
  rmSync(artifactBase, { recursive: true, force: true });
}
