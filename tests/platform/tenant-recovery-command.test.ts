import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const script = readFileSync(join(process.cwd(), 'scripts', 'tenant-recover.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

test('tenant recovery exposes the approved subcommands and dry-run default', () => {
  assert.equal(packageJson.scripts?.['tenant:recover'], 'node --import tsx scripts/tenant-recover.ts');
  for (const command of ['inspect', 'reissue-credential', 'suspend-user', 'suspend-organisation', 'reactivate']) {
    assert.match(script, new RegExp(`['"]${command}['"]`));
  }
  assert.match(script, /All mutations default to --dry-run/);
  assert.match(script, /--execute/);
  assert.match(script, /--dry-run and --execute cannot be combined/);
});

test('tenant recovery requires ignored JSON input and rejects secret fields', () => {
  assert.match(script, /git', \['check-ignore', '--quiet'/);
  assert.match(script, /must identify an existing JSON file/);
  assert.match(script, /Secret material is not accepted/);
  assert.match(script, /Production execution is unavailable/);
});

test('tenant recovery uses the database safety guard and fake delivery only', () => {
  assert.match(script, /assertDatabaseOperationAllowed/);
  assert.match(script, /operation: options\.execute \? 'one-off-mutation' : 'read-only-diagnostic'/);
  assert.match(script, /new FakeCredentialDeliveryAdapter/);
  assert.match(script, /environment\)/);
  assert.match(script, /scrubSafeOutput/);
});

test('tenant recovery output has no credential or session material', () => {
  assert.match(script, /plaintext|password\(hash\)\?|session\(token\|hash\)\?|cookie/);
  assert.match(script, /temporarycredential/i);
  assert.match(script, /Tenant recovery failed safely/);
});
