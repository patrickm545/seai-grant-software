import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Vercel deployment checks guarded migration status before building the application', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
    buildCommand?: string;
    installCommand?: string;
  };

  assert.equal(config.installCommand, 'pnpm install --frozen-lockfile');
  assert.equal(config.buildCommand, 'pnpm db:status && pnpm build');
  assert.ok(config.buildCommand.indexOf('pnpm db:status') < config.buildCommand.indexOf('pnpm build'));
});
