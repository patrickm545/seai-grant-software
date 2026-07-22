import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const script = readFileSync(resolve(projectRoot, 'scripts/solargrant-jurisdiction-audit.ts'), 'utf8');
const packageJson = readFileSync(resolve(projectRoot, 'package.json'), 'utf8');

test('jurisdiction audit remains a fixed-purpose read-only command', () => {
  assert.match(packageJson, /"solargrant:jurisdiction-audit"/);
  assert.match(script, /operation: 'jurisdiction-audit'/);
  assert.match(script, /process\.argv\.slice\(2\)\.length > 0/);
  assert.match(script, /select:\s*\{\s*organisationId: true,\s*county: true,\s*eircode: true/s);
  assert.doesNotMatch(script, /\.(create|update|upsert|delete|executeRaw|queryRaw)\s*\(/);
  assert.doesNotMatch(script, /fullName|addressLine|mprn|email|phone|notes/);
});
