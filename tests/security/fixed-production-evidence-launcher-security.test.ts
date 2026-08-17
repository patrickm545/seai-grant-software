import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  FIXED_LAUNCHER_SMOKE_ARGUMENT,
  FIXED_LAUNCHER_SMOKE_SCRIPT,
  FIXED_PRODUCTION_EVIDENCE_SCRIPT,
  PINNED_PACKAGE_MANAGER
} from '../../lib/fixed-package-script-launcher';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  packageManager: string;
  scripts: Record<string, string>;
};
const launcherSource = readFileSync(
  'scripts/launch-production-evidence-capture.ts',
  'utf8'
);
const launcherLibrarySource = readFileSync(
  'lib/fixed-package-script-launcher.ts',
  'utf8'
);
const retentionSource = readFileSync(
  'lib/production-evidence-operation-retention.ts',
  'utf8'
);
const smokeSource = readFileSync('scripts/smoke-package-manager-launcher.ts', 'utf8');
const smokeTargetSource = readFileSync('scripts/fixed-launcher-smoke-target.ts', 'utf8');
const retentionSmokeSource = readFileSync(
  'scripts/smoke-production-evidence-retention.ts',
  'utf8'
);
const operationRecord = readFileSync(
  'docs/03-engineering/PR_45_ADR_0024_PRODUCTION_EVIDENCE_OPERATION.md',
  'utf8'
);
const r16Record = readFileSync(
  'docs/03-engineering/PR_45_ADR_0024_PRODUCTION_EVIDENCE_R16.md',
  'utf8'
);

test('launcher pins the existing fixed capture command and package manager', () => {
  assert.equal(PINNED_PACKAGE_MANAGER, packageJson.packageManager);
  assert.equal(
    FIXED_PRODUCTION_EVIDENCE_SCRIPT,
    'db:lineage:capture-production-evidence'
  );
  assert.equal(
    packageJson.scripts[FIXED_PRODUCTION_EVIDENCE_SCRIPT],
    'node --import tsx scripts/verify-migration-lineage.ts production-evidence-capture'
  );
  assert.match(launcherSource, /process\.argv\.length !== 2/);
  assert.doesNotMatch(
    launcherSource,
    /migrate-(?:production|deploy|resolve)|db push|production-status|DATABASE_URL/
  );
});

test('launcher boundary has no ProcessStartInfo, ArgumentList, or shell fallback', () => {
  for (const source of [
    launcherSource,
    launcherLibrarySource,
    retentionSource,
    smokeSource,
    retentionSmokeSource
  ]) {
    assert.doesNotMatch(
      source,
      /ProcessStartInfo|ArgumentList|HashData|OrderedDictionary|shell\s*:\s*true|cmd\.exe|powershell/i
    );
  }
  assert.match(launcherLibrarySource, /spawnSync/);
  assert.match(launcherLibrarySource, /shell:\s*false/);
});

test('retention is write-first and uses Node raw-byte hashing after child completion', () => {
  const launchIndex = retentionSource.indexOf(
    '(dependencies.launch ?? launchFixedProductionEvidenceCaptureRaw)'
  );
  const stderrWriteIndex = retentionSource.indexOf(
    "writeDurableAtomic(join(operationDirectory, stderrReference)"
  );
  const childBoundaryIndex = retentionSource.indexOf(
    "join(operationDirectory, 'operation-boundary-child-complete.json')"
  );
  const hashIndex = retentionSource.indexOf('const stdoutSha256 = hashBytes');
  const parseIndex = retentionSource.indexOf('parseRetainedProductionDiagnostic');
  assert.ok(launchIndex >= 0);
  assert.ok(stderrWriteIndex > launchIndex);
  assert.ok(childBoundaryIndex > stderrWriteIndex);
  assert.ok(hashIndex > childBoundaryIndex);
  assert.ok(parseIndex >= 0);
  assert.match(retentionSource, /createHash\('sha256'\)\.update\(bytes\)/);
  assert.match(retentionSource, /fsyncSync\(descriptor\)/);
  assert.match(retentionSource, /renameSync\(temporary, path\)/);
  assert.doesNotMatch(retentionSource, /rmSync\(operationDirectory/);
});

test('retention smoke is synthetic, fixed, and cannot invoke Production', () => {
  assert.equal(
    packageJson.scripts['launcher:retention:smoke'],
    'node --import tsx scripts/smoke-production-evidence-retention.ts'
  );
  assert.match(retentionSmokeSource, /retention OK/);
  assert.match(retentionSmokeSource, /launches \+= 1/);
  assert.doesNotMatch(
    retentionSmokeSource,
    /PrismaClient|DATABASE_URL|production-evidence-capture|migration-status|migrate|deploy/
  );
});

test('smoke target is fixed, harmless, and cannot reach Production tooling', () => {
  assert.equal(FIXED_LAUNCHER_SMOKE_SCRIPT, 'launcher:smoke:target');
  assert.equal(FIXED_LAUNCHER_SMOKE_ARGUMENT, '--fixed-launcher-smoke-v1');
  assert.equal(
    packageJson.scripts['launcher:smoke'],
    'node --import tsx scripts/smoke-package-manager-launcher.ts'
  );
  assert.equal(
    packageJson.scripts[FIXED_LAUNCHER_SMOKE_SCRIPT],
    'node --import tsx scripts/fixed-launcher-smoke-target.ts --fixed-launcher-smoke-v1'
  );
  for (const source of [smokeSource, smokeTargetSource]) {
    assert.doesNotMatch(
      source,
      /DATABASE_URL|PrismaClient|production-evidence-capture|migration-status|migrate|deploy/
    );
  }
  assert.match(smokeSource, /launcher OK/);
});

test('closed operation remains recorded as stopped before command or connection', () => {
  assert.match(
    operationRecord,
    /`CHG-2026-07-29-ADR0024-PROD-EVIDENCE` is historical evidence only/
  );
  assert.match(operationRecord, /Fixed command \| Did not launch/);
  assert.match(
    operationRecord,
    /Production connection or query \| Not opened or executed/
  );
  assert.match(operationRecord, /Retry \| None/);
  assert.match(operationRecord, /Change ID disposition \| Closed; must not be reused/);
});

test('R16 remains closed without reconstructing the lost mismatch', () => {
  assert.match(r16Record, /`LEDGER_MISMATCH`, typed exit `25`/);
  assert.match(r16Record, /Permanently closed; must not be reused or retried/);
  assert.match(r16Record, /exact migration or record/);
  assert.match(r16Record, /must\s+not be inferred/);
  assert.match(r16Record, /zero captures and\s+zero approvals/);
  assert.doesNotMatch(r16Record, /R16.*(?:checksum|candidate).*matched/i);
});
