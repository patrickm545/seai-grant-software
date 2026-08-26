import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const captureScript = readFileSync(
  'scripts/capture-post-migration-production-evidence.ts',
  'utf8'
);
const retainedLauncher = readFileSync(
  'scripts/launch-post-migration-production-evidence.ts',
  'utf8'
);
const fixedLauncher = readFileSync('lib/fixed-database-command-launcher.ts', 'utf8');

test('post-migration capture source has one fixed read-only transaction statement and no mutation command', () => {
  const executableSql = [
    ...captureScript.matchAll(/\$executeRawUnsafe\(([^\n]+)\)/g)
  ].map((match) => match[1]);
  assert.deepEqual(executableSql, ["'SET TRANSACTION READ ONLY'"]);
  assert.doesNotMatch(
    captureScript,
    /migrate\s+(?:deploy|resolve)|db\s+push|\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE)\b/i
  );
  assert.doesNotMatch(captureScript, /child_process.*spawn|exec\(|execSync\(/i);
});

test('fixed post-migration launchers accept no caller argv, shell interpolation, or caller script path', () => {
  assert.match(captureScript, /process\.argv\.length !== 2/);
  assert.match(retainedLauncher, /process\.argv\.length !== 2/);
  assert.doesNotMatch(retainedLauncher, /cmd\.exe|powershell|shell:\s*true|process\.argv\[2\]/i);
  assert.match(
    fixedLauncher,
    /scripts\/capture-post-migration-production-evidence\.ts/
  );
  assert.match(
    fixedLauncher,
    /scripts\/launch-post-migration-production-evidence\.ts/
  );
  assert.match(fixedLauncher, /shell:\s*false/);
});

test('capture output never serializes URL, host, raw SQL, or unrestricted environment objects', () => {
  assert.doesNotMatch(captureScript, /identity\.host|process\.env\s*[,}]|JSON\.stringify\(process\.env/);
  assert.doesNotMatch(captureScript, /DATABASE_URL[^\n]*(?:console|stdout|stderr)/);
  assert.match(captureScript, /assertVerifierEvidenceSecretFree\(evidence\)/);
});
