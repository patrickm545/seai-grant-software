import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveVercelDatabasePreflight } from '../../lib/vercel-build-safety';

test('Vercel deployment uses the environment-aware guarded database preflight', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
    buildCommand?: string;
    installCommand?: string;
  };

  assert.equal(config.installCommand, 'pnpm install --frozen-lockfile');
  assert.equal(config.buildCommand, 'node --import tsx scripts/run-vercel-build.ts');
});

test('Preview applies committed migrations through the guarded Preview command', () => {
  assert.deepEqual(
    resolveVercelDatabasePreflight({ VERCEL_ENV: 'preview', APP_ENV: 'preview' }),
    { environment: 'preview', databaseCommand: 'migrate-preview' }
  );
});

test('Production and Development builds are status-only', () => {
  assert.deepEqual(
    resolveVercelDatabasePreflight({ VERCEL_ENV: 'production', APP_ENV: 'production' }),
    { environment: 'production', databaseCommand: 'status' }
  );
  assert.deepEqual(
    resolveVercelDatabasePreflight({ VERCEL_ENV: 'development', APP_ENV: 'development' }),
    { environment: 'development', databaseCommand: 'status' }
  );
});

test('Vercel build preflight fails closed on missing or mismatched classification', () => {
  assert.throws(
    () => resolveVercelDatabasePreflight({ VERCEL_ENV: 'production', APP_ENV: 'preview' }),
    /must identify the same/
  );
  assert.throws(
    () => resolveVercelDatabasePreflight({ VERCEL_ENV: 'preview' }),
    /APP_ENV/
  );
});
