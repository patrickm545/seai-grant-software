import type { CatalogSnapshot } from '../../lib/schema-fingerprint';
import { preMigrationCatalogWithPilotAuth } from './historical-resolved-migration-fixture';

export function postPasswordResetCatalogWithPilotAuth(): CatalogSnapshot {
  const catalog = preMigrationCatalogWithPilotAuth();
  catalog.tables.push({
    schema: 'public',
    name: 'PasswordResetRequest',
    kind: 'table'
  });
  const columns = [
    [1, 'id', 'text', 'text', false, null],
    [2, 'userId', 'text', 'text', false, null],
    [3, 'tokenDigest', 'text', 'text', false, null],
    [4, 'exchangeDigest', 'text', 'text', true, null],
    [5, 'status', 'USER-DEFINED', 'PasswordResetStatus', false, `'PENDING'::"PasswordResetStatus"`],
    [6, 'expiresAt', 'timestamp without time zone', 'timestamp', false, null],
    [7, 'dispatchedAt', 'timestamp without time zone', 'timestamp', true, null],
    [8, 'exchangedAt', 'timestamp without time zone', 'timestamp', true, null],
    [9, 'consumedAt', 'timestamp without time zone', 'timestamp', true, null],
    [10, 'revokedAt', 'timestamp without time zone', 'timestamp', true, null],
    [11, 'revocationReason', 'USER-DEFINED', 'PasswordResetRevocationReason', true, null],
    [12, 'providerName', 'text', 'text', true, null],
    [13, 'providerReceiptId', 'text', 'text', true, null],
    [14, 'correlationId', 'text', 'text', true, null],
    [15, 'createdAt', 'timestamp without time zone', 'timestamp', false, 'CURRENT_TIMESTAMP'],
    [16, 'updatedAt', 'timestamp without time zone', 'timestamp', false, null]
  ] as const;
  catalog.columns.push(
    ...columns.map(
      ([position, name, dataType, databaseType, nullable, defaultExpression]) => ({
        schema: 'public',
        table: 'PasswordResetRequest',
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
      table: 'PasswordResetRequest',
      name: 'PasswordResetRequest_pkey',
      type: 'p',
      definition: 'PRIMARY KEY (id)',
      columns: ['id'],
      referencedSchema: null,
      referencedTable: null
    },
    {
      schema: 'public',
      table: 'PasswordResetRequest',
      name: 'PasswordResetRequest_userId_fkey',
      type: 'f',
      definition:
        'FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
      columns: ['userId'],
      referencedSchema: 'public',
      referencedTable: 'User'
    }
  );
  const index = (
    name: string,
    keyColumns: string[],
    unique = false,
    primary = false,
    constraintBacked = false
  ): CatalogSnapshot['indexes'][number] => ({
    schema: 'public',
    table: 'PasswordResetRequest',
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
    index('PasswordResetRequest_pkey', ['id'], true, true, true),
    index('PasswordResetRequest_tokenDigest_key', ['tokenDigest'], true),
    index('PasswordResetRequest_exchangeDigest_key', ['exchangeDigest'], true),
    index('PasswordResetRequest_correlationId_key', ['correlationId'], true),
    index('PasswordResetRequest_userId_status_createdAt_idx', [
      'userId',
      'status',
      'createdAt'
    ]),
    index('PasswordResetRequest_expiresAt_idx', ['expiresAt']),
    index('PasswordResetRequest_status_updatedAt_idx', ['status', 'updatedAt'])
  );
  catalog.enums.push(
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
  );
  return catalog;
}
