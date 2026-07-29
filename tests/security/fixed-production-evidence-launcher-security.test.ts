import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
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
const operationRecord = readFileSync(
  'docs/03-engineering/PR_45_ADR_0024_PRODUCTION_EVIDENCE_OPERATION.md',
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
