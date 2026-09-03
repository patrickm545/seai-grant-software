import type { CatalogSnapshot } from '../../lib/schema-fingerprint';
import { preMigrationCatalog } from './schema-fingerprint.test';

export function preMigrationCatalogWithPilotAuth(): CatalogSnapshot {
  const catalog = preMigrationCatalog();
  catalog.tables.push(
    { schema: 'public', name: 'Organisation', kind: 'table' },
    { schema: 'public', name: 'User', kind: 'table' },
    { schema: 'public', name: 'OrganisationMembership', kind: 'table' },
    { schema: 'public', name: 'AuthSession', kind: 'table' }
  );

  const columns = [
    ['Organisation', 1, 'slug', 'text', 'text', false, null],
    ['Organisation', 2, 'verified', 'boolean', 'bool', false, 'false'],
    ['User', 1, 'passwordHash', 'text', 'text', true, null],
    ['User', 2, 'lastLoginAt', 'timestamp without time zone', 'timestamp', true, null],
    ['AuthSession', 1, 'id', 'text', 'text', false, null],
    ['AuthSession', 2, 'userId', 'text', 'text', false, null],
    ['AuthSession', 3, 'tokenHash', 'text', 'text', false, null],
    ['AuthSession', 4, 'expiresAt', 'timestamp without time zone', 'timestamp', false, null],
    [
      'AuthSession',
      5,
      'createdAt',
      'timestamp without time zone',
      'timestamp',
      false,
      'CURRENT_TIMESTAMP'
    ],
    ['AuthSession', 6, 'sessionType', 'USER-DEFINED', 'AuthSessionType', false, null]
  ] as const;
  catalog.columns.push(
    ...columns.map(
      ([table, position, name, dataType, databaseType, nullable, defaultExpression]) => ({
        schema: 'public',
        table,
        position,
        name,
        dataType,
        databaseType,
        nullable,
        defaultExpression,
        identity: null,
        generated: null
      })
    )
  );

  catalog.constraints.push(
    {
      schema: 'public',
      table: 'AuthSession',
      name: 'AuthSession_pkey',
      type: 'p',
      definition: 'PRIMARY KEY (id)',
      columns: ['id'],
      referencedSchema: null,
      referencedTable: null
    },
    {
      schema: 'public',
      table: 'User',
      name: 'User_email_normalised_check',
      type: 'c',
      definition: 'CHECK (email = lower(TRIM(BOTH FROM email)))',
      columns: ['email'],
      referencedSchema: null,
      referencedTable: null
    },
    {
      schema: 'public',
      table: 'AuthSession',
      name: 'AuthSession_userId_fkey',
      type: 'f',
      definition:
        'FOREIGN KEY (userId) REFERENCES public.User(id) ON UPDATE CASCADE ON DELETE CASCADE',
      columns: ['userId'],
      referencedSchema: 'public',
      referencedTable: 'User'
    }
  );

  const index = (
    table: string,
    name: string,
    keyColumns: string[],
    unique = false,
    primary = false,
    constraintBacked = false
  ): CatalogSnapshot['indexes'][number] => ({
    schema: 'public',
    table,
    name,
    unique,
    primary,
    keyColumns,
    includedColumns: [],
    hasExpressions: false,
    expression: null,
    partial: false,
    predicate: null,
    constraintBacked,
    definition: `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${name}`
  });
  catalog.indexes.push(
    index('Organisation', 'Organisation_slug_key', ['slug'], true),
    index('OrganisationMembership', 'OrganisationMembership_userId_key', ['userId'], true),
    index('AuthSession', 'AuthSession_pkey', ['id'], true, true, true),
    index('AuthSession', 'AuthSession_tokenHash_key', ['tokenHash'], true),
    index('AuthSession', 'AuthSession_userId_expiresAt_idx', ['userId', 'expiresAt']),
    index('AuthSession', 'AuthSession_expiresAt_idx', ['expiresAt']),
    index('AuthSession', 'AuthSession_userId_sessionType_expiresAt_idx', [
      'userId',
      'sessionType',
      'expiresAt'
    ])
  );
  catalog.enums.push({
    schema: 'public',
    name: 'AuthSessionType',
    values: ['NORMAL', 'RESTRICTED_FIRST_LOGIN']
  });
  return catalog;
}
