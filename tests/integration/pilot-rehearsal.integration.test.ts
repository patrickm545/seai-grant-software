import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { assertRehearsalSecretFree } from '../../lib/pilot-rehearsal';

test('complete disposable pilot rehearsal passes and leaves no secret-bearing report', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/pilot-rehearsal.ts', '--execute'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_ENVIRONMENT: 'test',
        AUTH_SESSION_PEPPER: 'pr31-integration-test-session-pepper-20260720'
      },
      encoding: 'utf8',
      timeout: 180_000
    }
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout) as {
    ok: boolean;
    rehearsal: { status: string; stagesPassed: number; stagesTotal: number; cleanupSucceeded: boolean; reportFiles: string[] };
  };
  assert.equal(output.ok, true);
  assert.equal(output.rehearsal.status, 'PASSED');
  assert.equal(output.rehearsal.stagesPassed, output.rehearsal.stagesTotal);
  assert.equal(output.rehearsal.cleanupSucceeded, true);
  for (const reportFile of output.rehearsal.reportFiles) {
    const content = readFileSync(join(process.cwd(), reportFile), 'utf8');
    assert.doesNotMatch(content, /passwordHash|sessionToken|tokenHash|postgresql:\/\/|\$argon2/i);
    if (reportFile.endsWith('.json')) {
      const report = JSON.parse(content);
      assertRehearsalSecretFree(report);
      assert.equal(report.status, 'PASSED');
      assert.equal(report.syntheticDataOnly, true);
      assert.equal(report.cleanupSucceeded, true);
    }
  }
});
