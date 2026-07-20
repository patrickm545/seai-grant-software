import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { assertAuditEventChain, assertRehearsalSecretFree, buildRehearsalMarkdown } from '../../lib/pilot-rehearsal';

const script = readFileSync(join(process.cwd(), 'scripts', 'pilot-rehearsal.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> };

test('pilot rehearsal command is guarded, disposable and dry-run first', () => {
  assert.equal(packageJson.scripts['pilot:rehearsal'], 'node --import tsx scripts/pilot-rehearsal.ts');
  assert.match(script, /assertDisposableTestDatabase/);
  assert.match(script, /operation: mode === 'execute' \? 'destructive-test' : 'read-only-diagnostic'/);
  assert.match(script, /Pilot rehearsal requires a local disposable PostgreSQL host/);
  assert.match(script, /Production execution remains disabled/);
  assert.match(script, /FakeCredentialDeliveryAdapter/);
  assert.match(script, /\.tools.*pilot-rehearsal/);
});

test('rehearsal audit helper requires the safe event chain and rejects secret fields', () => {
  const summary = assertAuditEventChain(
    [
      { action: 'PROVISIONING_COMPLETED', metadataJson: { reasonCode: 'SYNTHETIC' } },
      { action: 'RECOVERY_OPERATION_COMPLETED', metadataJson: { operationId: 'safe-operation' } }
    ],
    ['PROVISIONING_COMPLETED', 'RECOVERY_OPERATION_COMPLETED']
  );
  assert.equal(summary.count, 2);
  assert.throws(() => assertAuditEventChain([{ action: 'PROVISIONING_COMPLETED', metadataJson: {} }], ['FIRST_LOGIN_COMPLETED']), /incomplete/i);
  assert.throws(() => assertRehearsalSecretFree({ metadata: { passwordHash: 'hidden' } }), /secret-like/i);
});

test('rehearsal report markdown is secret-free and records readiness gaps', () => {
  const report = {
    rehearsalId: 'pilot-rehearsal-test',
    databaseFingerprint: 'db_disposable_test',
    status: 'PASSED' as const,
    stages: [{ name: 'synthetic stage', status: 'PASSED' as const, details: { deliveryCount: 1 } }],
    readinessGaps: ['Production execution remains disabled.']
  };
  const markdown = buildRehearsalMarkdown(report);
  assert.match(markdown, /Production execution remains disabled/);
  assert.doesNotMatch(markdown, /passwordHash|sessionToken|postgresql:\/\//i);
});

test('pilot rehearsal refuses Production and unknown database fingerprints before connecting', () => {
  const common = {
    ...process.env,
    DATABASE_URL: 'postgresql://127.0.0.1:55439/clada_pr31_guard_test',
    PREVIEW_DATABASE_FINGERPRINT: 'db_preview_known',
    DEVELOPMENT_DATABASE_FINGERPRINT: 'db_development_known',
    AUTH_SESSION_PEPPER: 'pr31-unit-test-session-pepper-20260720'
  };
  const production = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/pilot-rehearsal.ts', '--execute'], {
    cwd: process.cwd(),
    env: { ...common, APP_ENV: 'production', DATABASE_ENVIRONMENT: 'production', DATABASE_FINGERPRINT: 'db_production_known', PRODUCTION_DATABASE_FINGERPRINT: 'db_production_known' },
    encoding: 'utf8'
  });
  assert.equal(production.status, 4);
  assert.match(production.stderr, /DATABASE_GUARD_DENIED/);

  const unknown = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/pilot-rehearsal.ts', '--execute'], {
    cwd: process.cwd(),
    env: { ...common, APP_ENV: 'test', DATABASE_ENVIRONMENT: 'test', DATABASE_FINGERPRINT: 'db_unknown', PRODUCTION_DATABASE_FINGERPRINT: 'db_production_known' },
    encoding: 'utf8'
  });
  assert.equal(unknown.status, 4);
  assert.match(unknown.stderr, /DATABASE_GUARD_DENIED/);
});
