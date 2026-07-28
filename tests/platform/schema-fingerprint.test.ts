import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNamedCatalog,
  fingerprintCatalog,
  type CatalogSnapshot
} from '../../lib/schema-fingerprint';

export function preMigrationCatalog(): CatalogSnapshot {
  return {
    namespaces: [{ name: 'public' }],
    tables: [{ schema: 'public', name: 'Lead', kind: 'table' }],
    columns: [
      ['internalNotes', 'text'],
      ['followUpDate', 'timestamp without time zone'],
      ['assignedAdmin', 'text'],
      ['assignedInstaller', 'text']
    ].map(([name, dataType], position) => ({
      schema: 'public',
      table: 'Lead',
      position: position + 1,
      name,
      dataType,
      databaseType: dataType === 'text' ? 'text' : 'timestamp',
      nullable: true,
      defaultExpression: null,
      identity: null,
      generated: null
    })),
    constraints: [],
    indexes: [],
    enums: [],
    extensions: [{ name: 'plpgsql', version: '1.0', schema: 'pg_catalog' }],
    triggers: [],
    sequences: [],
    unsupportedObjects: []
  };
}

test('schema fingerprint is deterministic under unordered database rows', () => {
  const first = preMigrationCatalog();
  const second = structuredClone(first);
  second.columns.reverse();
  assert.equal(fingerprintCatalog(first).fingerprint, fingerprintCatalog(second).fingerprint);
  assert.deepEqual(assertNamedCatalog(first, 'pre-password-reset').results.length, 5);
});

test('schema and named assertions fail on nullable, default, index, or reset-object drift', () => {
  const nullable = preMigrationCatalog();
  nullable.columns[0].nullable = false;
  assert.throws(() => assertNamedCatalog(nullable, 'pre-password-reset'), /nullability/);

  const withDefault = preMigrationCatalog();
  withDefault.columns[0].defaultExpression = "''::text";
  assert.throws(() => assertNamedCatalog(withDefault, 'pre-password-reset'), /default/);

  const withIndex = preMigrationCatalog();
  withIndex.indexes.push({
    schema: 'public',
    table: 'Lead',
    name: 'Lead_internalNotes_idx',
    unique: false,
    primary: false,
    definition: 'CREATE INDEX "Lead_internalNotes_idx" ON public."Lead" ("internalNotes")'
  });
  assert.throws(() => assertNamedCatalog(withIndex, 'pre-password-reset'), /index or constraint/);

  const earlyReset = preMigrationCatalog();
  earlyReset.tables.push({ schema: 'public', name: 'PasswordResetRequest', kind: 'table' });
  assert.throws(() => assertNamedCatalog(earlyReset, 'pre-password-reset'), /must be absent/);
  assert.notEqual(fingerprintCatalog(earlyReset).fingerprint, fingerprintCatalog(preMigrationCatalog()).fingerprint);
});
