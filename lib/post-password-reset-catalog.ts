import { canonicalJson } from './canonical-json';
import { assertNamedCatalog, type CatalogSnapshot } from './schema-fingerprint';

export const POST_PASSWORD_RESET_ASSERTIONS_VERSION =
  'adr-0024-post-password-reset-catalog-assertions/v1' as const;

type ExpectedColumn = Pick<
  CatalogSnapshot['columns'][number],
  | 'position'
  | 'name'
  | 'dataType'
  | 'databaseType'
  | 'nullable'
  | 'defaultExpression'
  | 'identity'
  | 'generated'
>;

const expectedColumns: ExpectedColumn[] = [
  { position: 1, name: 'id', dataType: 'text', databaseType: 'text', nullable: false, defaultExpression: null, identity: null, generated: null },
  { position: 2, name: 'userId', dataType: 'text', databaseType: 'text', nullable: false, defaultExpression: null, identity: null, generated: null },
  { position: 3, name: 'tokenDigest', dataType: 'text', databaseType: 'text', nullable: false, defaultExpression: null, identity: null, generated: null },
  { position: 4, name: 'exchangeDigest', dataType: 'text', databaseType: 'text', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 5, name: 'status', dataType: 'USER-DEFINED', databaseType: 'PasswordResetStatus', nullable: false, defaultExpression: `'PENDING'::"PasswordResetStatus"`, identity: null, generated: null },
  { position: 6, name: 'expiresAt', dataType: 'timestamp without time zone', databaseType: 'timestamp', nullable: false, defaultExpression: null, identity: null, generated: null },
  { position: 7, name: 'dispatchedAt', dataType: 'timestamp without time zone', databaseType: 'timestamp', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 8, name: 'exchangedAt', dataType: 'timestamp without time zone', databaseType: 'timestamp', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 9, name: 'consumedAt', dataType: 'timestamp without time zone', databaseType: 'timestamp', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 10, name: 'revokedAt', dataType: 'timestamp without time zone', databaseType: 'timestamp', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 11, name: 'revocationReason', dataType: 'USER-DEFINED', databaseType: 'PasswordResetRevocationReason', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 12, name: 'providerName', dataType: 'text', databaseType: 'text', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 13, name: 'providerReceiptId', dataType: 'text', databaseType: 'text', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 14, name: 'correlationId', dataType: 'text', databaseType: 'text', nullable: true, defaultExpression: null, identity: null, generated: null },
  { position: 15, name: 'createdAt', dataType: 'timestamp without time zone', databaseType: 'timestamp', nullable: false, defaultExpression: 'CURRENT_TIMESTAMP', identity: null, generated: null },
  { position: 16, name: 'updatedAt', dataType: 'timestamp without time zone', databaseType: 'timestamp', nullable: false, defaultExpression: null, identity: null, generated: null }
];

const expectedEnums = [
  {
    schema: 'public',
    name: 'PasswordResetStatus',
    values: ['PENDING', 'DISPATCHED', 'EXCHANGED', 'CONSUMED', 'REVOKED']
  },
  {
    schema: 'public',
    name: 'PasswordResetRevocationReason',
    values: ['SUPERSEDED', 'DELIVERY_FAILED', 'ADMINISTRATIVE']
  }
] as const;

const expectedIndexes = [
  { name: 'PasswordResetRequest_pkey', unique: true, primary: true, constraintBacked: true, keyColumns: ['id'] },
  { name: 'PasswordResetRequest_tokenDigest_key', unique: true, primary: false, constraintBacked: false, keyColumns: ['tokenDigest'] },
  { name: 'PasswordResetRequest_exchangeDigest_key', unique: true, primary: false, constraintBacked: false, keyColumns: ['exchangeDigest'] },
  { name: 'PasswordResetRequest_correlationId_key', unique: true, primary: false, constraintBacked: false, keyColumns: ['correlationId'] },
  { name: 'PasswordResetRequest_userId_status_createdAt_idx', unique: false, primary: false, constraintBacked: false, keyColumns: ['userId', 'status', 'createdAt'] },
  { name: 'PasswordResetRequest_expiresAt_idx', unique: false, primary: false, constraintBacked: false, keyColumns: ['expiresAt'] },
  { name: 'PasswordResetRequest_status_updatedAt_idx', unique: false, primary: false, constraintBacked: false, keyColumns: ['status', 'updatedAt'] }
] as const;

function fail(message: string): never {
  throw new Error(`Post-password-reset catalog assertion failed: ${message}`);
}

function normalizeDefinition(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function assertPostPasswordResetCatalog(snapshot: CatalogSnapshot) {
  const operationalAssertions = assertNamedCatalog(snapshot, 'post-password-reset');
  const results: Array<{ assertion: string; passed: true }> = [
    ...operationalAssertions.results
  ];

  const tables = snapshot.tables.filter(
    (table) => table.schema === 'public' && table.name === 'PasswordResetRequest'
  );
  if (tables.length !== 1 || tables[0].kind !== 'table') {
    fail('PasswordResetRequest must be exactly one ordinary public table.');
  }
  results.push({ assertion: 'PasswordResetRequest:exact-public-table', passed: true });

  const columns = snapshot.columns
    .filter(
      (column) => column.schema === 'public' && column.table === 'PasswordResetRequest'
    )
    .sort((left, right) => left.position - right.position)
    .map((column): ExpectedColumn => ({
      position: column.position,
      name: column.name,
      dataType: column.dataType,
      databaseType: column.databaseType,
      nullable: column.nullable,
      defaultExpression: column.defaultExpression,
      identity: column.identity,
      generated: column.generated
    }));
  if (canonicalJson(columns) !== canonicalJson(expectedColumns)) {
    fail('PasswordResetRequest column names, order, types, nullability, defaults, identity or generated state differ.');
  }
  results.push({ assertion: 'PasswordResetRequest:exact-16-column-descriptors', passed: true });

  const resetEnums = snapshot.enums
    .filter((item) => expectedEnums.some((expected) => expected.name === item.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  const sortedExpectedEnums = [...expectedEnums].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  if (canonicalJson(resetEnums) !== canonicalJson(sortedExpectedEnums)) {
    fail('Password-reset enum names or ordered values differ.');
  }
  results.push({ assertion: 'PasswordResetRequest:exact-enums-and-values', passed: true });

  const constraints = snapshot.constraints.filter(
    (constraint) =>
      constraint.schema === 'public' && constraint.table === 'PasswordResetRequest'
  );
  const notNullConstraints = constraints.filter((constraint) => constraint.type === 'n');
  const relationalConstraints = constraints.filter((constraint) => constraint.type !== 'n');
  const expectedNotNullConstraintColumns = [
    'id',
    'userId',
    'tokenDigest',
    'status',
    'expiresAt',
    'createdAt',
    'updatedAt'
  ];
  const canonicalNotNullConstraints = notNullConstraints
    .map((constraint) => ({
      name: constraint.name,
      type: constraint.type,
      columns: constraint.columns,
      referencedSchema: constraint.referencedSchema,
      referencedTable: constraint.referencedTable
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const expectedPostgres18NotNullConstraints = expectedNotNullConstraintColumns
    .map((column) => ({
      name: `PasswordResetRequest_${column}_not_null`,
      type: 'n',
      columns: [column],
      referencedSchema: null,
      referencedTable: null
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (
    notNullConstraints.length !== 0 &&
    canonicalJson(canonicalNotNullConstraints) !==
      canonicalJson(expectedPostgres18NotNullConstraints)
  ) {
    fail('PasswordResetRequest PostgreSQL 18 not-null constraint descriptors differ.');
  }
  if (relationalConstraints.length !== 2) {
    fail(
      'PasswordResetRequest must have exactly the primary-key and User foreign-key constraints; ' +
        `observed=${canonicalJson(
          relationalConstraints.map(({ name, type }) => ({ name, type }))
        )}.`
    );
  }
  const primary = relationalConstraints.find(
    (constraint) => constraint.name === 'PasswordResetRequest_pkey'
  );
  if (
    !primary ||
    primary.type !== 'p' ||
    canonicalJson(primary.columns) !== canonicalJson(['id']) ||
    primary.referencedSchema !== null ||
    primary.referencedTable !== null
  ) {
    fail('PasswordResetRequest_pkey differs.');
  }
  const foreignKey = relationalConstraints.find(
    (constraint) => constraint.name === 'PasswordResetRequest_userId_fkey'
  );
  if (
    !foreignKey ||
    foreignKey.type !== 'f' ||
    canonicalJson(foreignKey.columns) !== canonicalJson(['userId']) ||
    foreignKey.referencedSchema !== 'public' ||
    foreignKey.referencedTable !== 'User' ||
    !/^FOREIGN KEY \("userId"\) REFERENCES (?:public\.)?"User"\(id\) ON UPDATE CASCADE ON DELETE RESTRICT$/.test(
      normalizeDefinition(foreignKey.definition)
    )
  ) {
    fail('PasswordResetRequest_userId_fkey must target public.User(id) with UPDATE CASCADE and DELETE RESTRICT.');
  }
  results.push({
    assertion:
      notNullConstraints.length === 0
        ? 'PasswordResetRequest:exact-primary-and-restrictive-user-foreign-key'
        : 'PasswordResetRequest:exact-primary-restrictive-user-foreign-key-and-pg18-not-null-constraints',
    passed: true
  });

  const indexes = snapshot.indexes.filter(
    (index) => index.schema === 'public' && index.table === 'PasswordResetRequest'
  );
  if (indexes.length !== expectedIndexes.length) {
    fail('PasswordResetRequest index count differs.');
  }
  for (const expected of expectedIndexes) {
    const index = indexes.find((candidate) => candidate.name === expected.name);
    if (
      !index ||
      index.unique !== expected.unique ||
      index.primary !== expected.primary ||
      index.constraintBacked !== expected.constraintBacked ||
      canonicalJson(index.keyColumns) !== canonicalJson(expected.keyColumns) ||
      index.includedColumns.length !== 0 ||
      index.hasExpressions ||
      index.expression !== null ||
      index.partial ||
      index.predicate !== null
    ) {
      fail(`Index ${expected.name} differs from the canonical migration.`);
    }
  }
  results.push({ assertion: 'PasswordResetRequest:exact-seven-index-set', passed: true });

  if (
    snapshot.triggers.some(
      (trigger) => trigger.schema === 'public' && trigger.table === 'PasswordResetRequest'
    ) ||
    snapshot.sequences.some(
      (sequence) =>
        sequence.schema === 'public' && sequence.name.startsWith('PasswordResetRequest')
    )
  ) {
    fail('PasswordResetRequest must not have repository-unapproved triggers or sequences.');
  }
  results.push({ assertion: 'PasswordResetRequest:no-trigger-or-sequence', passed: true });

  return {
    version: POST_PASSWORD_RESET_ASSERTIONS_VERSION,
    profile: 'post-password-reset' as const,
    operationalAssertions,
    results
  };
}
