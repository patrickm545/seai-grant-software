import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateMigrationPreflight } from '../../lib/migration-status';

test('migration preflight accepts a clean schema', () => {
  assert.equal(evaluateMigrationPreflight(0, 'Database schema is up to date!'), 'up-to-date');
});

test('migration preflight accepts only non-divergent pending repository migrations', () => {
  assert.equal(
    evaluateMigrationPreflight(1, 'The following migration(s) have not yet been applied: 20260722190000_example'),
    'pending'
  );
});

test('migration preflight rejects database-only migrations even when repository migrations are pending', () => {
  const productionIncidentOutput = `
Your local migration history and the migrations table from your database are different:
The migrations have not yet been applied:
20260718130000_tenant_provisioning_data_model
The migration from the database are not found locally:
20260423093000_application_pack_admin_fields
`;
  assert.throws(
    () => evaluateMigrationPreflight(1, productionIncidentOutput),
    /divergent or contains a failed migration/
  );
});

test('migration preflight rejects failed and ambiguous states', () => {
  assert.throws(() => evaluateMigrationPreflight(1, 'A failed migration was found.'), /failed migration/);
  assert.throws(() => evaluateMigrationPreflight(2, 'connection timed out'), /could not prove/);
});
