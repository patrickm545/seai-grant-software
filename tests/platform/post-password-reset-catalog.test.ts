import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPostPasswordResetCatalog,
  POST_PASSWORD_RESET_ASSERTIONS_VERSION
} from '../../lib/post-password-reset-catalog';
import { postPasswordResetCatalogWithPilotAuth } from './post-password-reset-catalog-fixture';

test('post-password-reset assertions require the complete canonical reset catalog and existing Lead controls', () => {
  const result = assertPostPasswordResetCatalog(postPasswordResetCatalogWithPilotAuth());
  assert.equal(result.version, POST_PASSWORD_RESET_ASSERTIONS_VERSION);
  assert.equal(result.profile, 'post-password-reset');
  assert.equal(result.operationalAssertions.results.length, 5);
  assert.ok(result.results.length > result.operationalAssertions.results.length);
});

test('post-password-reset assertions reject missing table and column descriptor drift', () => {
  const missingTable = postPasswordResetCatalogWithPilotAuth();
  missingTable.tables = missingTable.tables.filter(
    (table) => table.name !== 'PasswordResetRequest'
  );
  assert.throws(
    () => assertPostPasswordResetCatalog(missingTable),
    /must exist after migration|exactly one ordinary/
  );

  for (const mutate of [
    (catalog: ReturnType<typeof postPasswordResetCatalogWithPilotAuth>) => {
      catalog.columns = catalog.columns.filter(
        (column) =>
          !(column.table === 'PasswordResetRequest' && column.name === 'exchangeDigest')
      );
    },
    (catalog: ReturnType<typeof postPasswordResetCatalogWithPilotAuth>) => {
      catalog.columns.find(
        (column) => column.table === 'PasswordResetRequest' && column.name === 'status'
      )!.defaultExpression = null;
    },
    (catalog: ReturnType<typeof postPasswordResetCatalogWithPilotAuth>) => {
      catalog.columns.find(
        (column) => column.table === 'PasswordResetRequest' && column.name === 'expiresAt'
      )!.nullable = true;
    },
    (catalog: ReturnType<typeof postPasswordResetCatalogWithPilotAuth>) => {
      catalog.columns.find(
        (column) => column.table === 'PasswordResetRequest' && column.name === 'id'
      )!.identity = 'BY DEFAULT';
    }
  ]) {
    const catalog = postPasswordResetCatalogWithPilotAuth();
    mutate(catalog);
    assert.throws(() => assertPostPasswordResetCatalog(catalog), /column names, order, types/);
  }
});

test('post-password-reset assertions reject enum, index, constraint, and referential-action drift', () => {
  const wrongEnum = postPasswordResetCatalogWithPilotAuth();
  wrongEnum.enums.find((item) => item.name === 'PasswordResetStatus')!.values.pop();
  assert.throws(() => assertPostPasswordResetCatalog(wrongEnum), /enum names or ordered values/);

  const missingIndex = postPasswordResetCatalogWithPilotAuth();
  missingIndex.indexes = missingIndex.indexes.filter(
    (index) => index.name !== 'PasswordResetRequest_expiresAt_idx'
  );
  assert.throws(() => assertPostPasswordResetCatalog(missingIndex), /index count/);

  const unexpectedIndex = postPasswordResetCatalogWithPilotAuth();
  unexpectedIndex.indexes.push({
    ...unexpectedIndex.indexes.find(
      (index) => index.name === 'PasswordResetRequest_expiresAt_idx'
    )!,
    name: 'PasswordResetRequest_unapproved_idx'
  });
  assert.throws(() => assertPostPasswordResetCatalog(unexpectedIndex), /index count/);

  for (const definition of [
    'FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE',
    'FOREIGN KEY ("userId") REFERENCES "Organisation"(id) ON UPDATE CASCADE ON DELETE RESTRICT'
  ]) {
    const catalog = postPasswordResetCatalogWithPilotAuth();
    const foreignKey = catalog.constraints.find(
      (constraint) => constraint.name === 'PasswordResetRequest_userId_fkey'
    )!;
    foreignKey.definition = definition;
    if (definition.includes('Organisation')) foreignKey.referencedTable = 'Organisation';
    assert.throws(() => assertPostPasswordResetCatalog(catalog), /must target public.User/);
  }
});

test('post-password-reset assertions preserve current Lead operational prohibitions', () => {
  const catalog = postPasswordResetCatalogWithPilotAuth();
  catalog.indexes.push({
    ...catalog.indexes.find((index) => index.name === 'PasswordResetRequest_expiresAt_idx')!,
    table: 'Lead',
    name: 'Lead_internalNotes_unapproved_idx',
    keyColumns: ['internalNotes']
  });
  assert.throws(() => assertPostPasswordResetCatalog(catalog), /index or constraint/);
});

test('PostgreSQL 18 not-null constraint descriptors are accepted only as the exact complete set', () => {
  const addPostgres18Constraints = (
    catalog: ReturnType<typeof postPasswordResetCatalogWithPilotAuth>
  ) => {
    for (const column of [
      'id',
      'userId',
      'tokenDigest',
      'status',
      'expiresAt',
      'createdAt',
      'updatedAt'
    ]) {
      catalog.constraints.push({
        schema: 'public',
        table: 'PasswordResetRequest',
        name: `PasswordResetRequest_${column}_not_null`,
        type: 'n',
        definition: `NOT NULL ${column}`,
        columns: [column],
        referencedSchema: null,
        referencedTable: null
      });
    }
  };
  const exact = postPasswordResetCatalogWithPilotAuth();
  addPostgres18Constraints(exact);
  assert.doesNotThrow(() => assertPostPasswordResetCatalog(exact));

  const incomplete = postPasswordResetCatalogWithPilotAuth();
  addPostgres18Constraints(incomplete);
  incomplete.constraints = incomplete.constraints.filter(
    (constraint) => constraint.name !== 'PasswordResetRequest_updatedAt_not_null'
  );
  assert.throws(
    () => assertPostPasswordResetCatalog(incomplete),
    /PostgreSQL 18 not-null constraint descriptors differ/
  );
});
