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

function index(
  overrides: Partial<CatalogSnapshot['indexes'][number]> = {}
): CatalogSnapshot['indexes'][number] {
  return {
    schema: 'public',
    table: 'Lead',
    name: 'ADR0024_structured_index',
    unique: false,
    primary: false,
    keyColumns: ['internalNotes'],
    includedColumns: [],
    hasExpressions: false,
    expression: null,
    partial: false,
    predicate: null,
    constraintBacked: false,
    definition: 'formatted SQL is fingerprint evidence only',
    ...overrides
  };
}

test('schema fingerprint is deterministic under unordered database rows', () => {
  const first = preMigrationCatalog();
  const second = structuredClone(first);
  second.columns.reverse();
  assert.equal(fingerprintCatalog(first).fingerprint, fingerprintCatalog(second).fingerprint);
  assert.deepEqual(assertNamedCatalog(first, 'pre-password-reset').results.length, 5);
});

test('schema and named assertions fail on nullable, default, dedicated index, or reset-object drift', () => {
  const nullable = preMigrationCatalog();
  nullable.columns[0].nullable = false;
  assert.throws(() => assertNamedCatalog(nullable, 'pre-password-reset'), /nullability/);

  const withDefault = preMigrationCatalog();
  withDefault.columns[0].defaultExpression = "''::text";
  assert.throws(() => assertNamedCatalog(withDefault, 'pre-password-reset'), /default/);

  const withIndex = preMigrationCatalog();
  withIndex.indexes.push(index());
  assert.throws(() => assertNamedCatalog(withIndex, 'pre-password-reset'), /index or constraint/);

  const earlyReset = preMigrationCatalog();
  earlyReset.tables.push({ schema: 'public', name: 'PasswordResetRequest', kind: 'table' });
  assert.throws(() => assertNamedCatalog(earlyReset, 'pre-password-reset'), /must be absent/);
  assert.notEqual(fingerprintCatalog(earlyReset).fingerprint, fingerprintCatalog(preMigrationCatalog()).fingerprint);
});

test('dedicated index assertion uses structured key metadata for unique, partial, and quoted forms', () => {
  for (const dedicated of [
    index({ unique: true }),
    index({ partial: true, predicate: '"internalNotes" IS NOT NULL' }),
    index({
      name: 'odd "quoted" index',
      definition: 'arbitrary formatting that does not mention the column'
    }),
    index({ constraintBacked: true, unique: true })
  ]) {
    const catalog = preMigrationCatalog();
    catalog.indexes.push(dedicated);
    assert.throws(() => assertNamedCatalog(catalog, 'pre-password-reset'), /index or constraint/);
  }
});

test('multi-column, expression, and INCLUDE-only occurrences are represented without false dedicated matches', () => {
  const catalog = preMigrationCatalog();
  catalog.indexes.push(
    index({ keyColumns: ['internalNotes', 'assignedAdmin'] }),
    index({
      name: 'expression_index',
      keyColumns: [null],
      hasExpressions: true,
      expression: 'lower("internalNotes")'
    }),
    index({
      name: 'include_index',
      keyColumns: ['id'],
      includedColumns: ['internalNotes']
    })
  );
  assert.equal(assertNamedCatalog(catalog, 'pre-password-reset').results.length, 5);
});

test('all structural index fields participate in the schema fingerprint', () => {
  const base = preMigrationCatalog();
  base.indexes.push(index({ keyColumns: ['id'], includedColumns: ['internalNotes'] }));
  const changed = structuredClone(base);
  changed.indexes[0].includedColumns = ['assignedAdmin'];
  assert.notEqual(fingerprintCatalog(base).fingerprint, fingerprintCatalog(changed).fingerprint);
});
