import type { Prisma } from '@prisma/client';
import type { CatalogSnapshot } from './schema-fingerprint';
import type { MigrationLedgerRow } from './migration-ledger';

type QueryClient = {
  $queryRawUnsafe<T = unknown>(query: string): Prisma.PrismaPromise<T>;
};

const safeArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('Catalog response ' + label + ' is malformed.');
  }
  return value;
}

function requireNullableStringArray(value: unknown, label: string): Array<string | null> {
  if (
    !Array.isArray(value) ||
    value.some((item) => item !== null && typeof item !== 'string')
  ) {
    throw new Error('Catalog response ' + label + ' is malformed.');
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error('Catalog response ' + label + ' is malformed.');
  return value;
}

export async function readMigrationLedger(client: QueryClient) {
  return client.$queryRawUnsafe<MigrationLedgerRow[]>(`
    SELECT id, migration_name, checksum,
           to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS started_at,
           CASE WHEN finished_at IS NULL THEN NULL
             ELSE to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') END AS finished_at,
           applied_steps_count,
           CASE WHEN rolled_back_at IS NULL THEN NULL
             ELSE to_char(rolled_back_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') END AS rolled_back_at,
           logs
    FROM public._prisma_migrations
    ORDER BY started_at ASC, id ASC
  `);
}

export async function readConnectedDatabaseIdentity(client: QueryClient) {
  const rows = await client.$queryRawUnsafe<
    Array<{ database_name: string; server_port: number; server_version: string }>
  >(`
    SELECT current_database() AS database_name,
           current_setting('port')::int AS server_port,
           current_setting('server_version') AS server_version
  `);
  if (rows.length !== 1) throw new Error('Connected database identity is ambiguous.');
  return rows[0];
}

export async function readCatalogSnapshot(client: QueryClient): Promise<CatalogSnapshot> {
  const [
    namespaces,
    tables,
    columns,
    constraints,
    indexes,
    enums,
    extensions,
    triggers,
    sequences,
    unsupportedObjects
  ] = await Promise.all([
    client.$queryRawUnsafe<Array<{ name: string }>>(`
      SELECT nspname AS name FROM pg_namespace WHERE nspname = 'public' ORDER BY nspname
    `),
    client.$queryRawUnsafe<CatalogSnapshot['tables']>(`
      SELECT n.nspname AS "schema", c.relname AS "name",
             CASE c.relkind WHEN 'r' THEN 'table' WHEN 'p' THEN 'partitioned-table' END AS kind
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY n.nspname, c.relname
    `),
    client.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT table_schema AS "schema", table_name AS "table",
             ordinal_position AS position, column_name AS "name",
             data_type AS "dataType", udt_name AS "databaseType",
             (is_nullable = 'YES') AS nullable, column_default AS "defaultExpression",
             NULLIF(identity_generation, '') AS identity,
             NULLIF(generation_expression, '') AS generated
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_schema, table_name, ordinal_position
    `),
    client.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT n.nspname AS "schema", c.relname AS "table", con.conname AS "name",
             con.contype::text AS "type", pg_get_constraintdef(con.oid, true) AS definition,
             COALESCE(array_agg(a.attname ORDER BY u.ordinality)
               FILTER (WHERE a.attname IS NOT NULL), ARRAY[]::name[]) AS columns,
             rn.nspname AS "referencedSchema", rc.relname AS "referencedTable"
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN LATERAL unnest(con.conkey) WITH ORDINALITY u(attnum, ordinality) ON true
      LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = u.attnum
      LEFT JOIN pg_class rc ON rc.oid = con.confrelid
      LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE n.nspname = 'public'
      GROUP BY n.nspname, c.relname, con.conname, con.contype, con.oid, rn.nspname, rc.relname
      ORDER BY n.nspname, c.relname, con.conname
    `),
    client.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT n.nspname AS "schema", t.relname AS "table", i.relname AS "name",
             ix.indisunique AS "unique", ix.indisprimary AS "primary",
             ARRAY(
               SELECT a.attname::text
               FROM unnest(ix.indkey) WITH ORDINALITY AS key(attnum, position)
               LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = key.attnum
               WHERE key.position <= ix.indnkeyatts
               ORDER BY key.position
             ) AS "keyColumns",
             ARRAY(
               SELECT a.attname::text
               FROM unnest(ix.indkey) WITH ORDINALITY AS included(attnum, position)
               JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = included.attnum
               WHERE included.position > ix.indnkeyatts
               ORDER BY included.position
             ) AS "includedColumns",
             (ix.indexprs IS NOT NULL) AS "hasExpressions",
             pg_get_expr(ix.indexprs, ix.indrelid, true) AS expression,
             (ix.indpred IS NOT NULL) AS partial,
             pg_get_expr(ix.indpred, ix.indrelid, true) AS predicate,
             EXISTS (
               SELECT 1 FROM pg_constraint con WHERE con.conindid = ix.indexrelid
             ) AS "constraintBacked",
             pg_get_indexdef(i.oid) AS definition
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
      ORDER BY n.nspname, t.relname, i.relname
    `),
    client.$queryRawUnsafe<Array<{ schema: string; name: string; values: string[] }>>(`
      SELECT n.nspname AS "schema", t.typname AS "name",
             array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public'
      GROUP BY n.nspname, t.typname
      ORDER BY n.nspname, t.typname
    `),
    client.$queryRawUnsafe<CatalogSnapshot['extensions']>(`
      SELECT e.extname AS "name", e.extversion AS version, n.nspname AS "schema"
      FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
      ORDER BY e.extname
    `),
    client.$queryRawUnsafe<CatalogSnapshot['triggers']>(`
      SELECT n.nspname AS "schema", c.relname AS "table", t.tgname AS "name",
             t.tgenabled::text AS enabled, pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
      ORDER BY n.nspname, c.relname, t.tgname
    `),
    client.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT schemaname AS "schema", sequencename AS "name", data_type AS "dataType",
             start_value::text AS start, increment_by::text AS increment,
             min_value::text AS minimum, max_value::text AS maximum, cycle
      FROM pg_sequences WHERE schemaname = 'public'
      ORDER BY schemaname, sequencename
    `),
    client.$queryRawUnsafe<CatalogSnapshot['unsupportedObjects']>(`
      SELECT n.nspname AS "schema", c.relname AS "name", c.relkind::text AS kind
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind NOT IN ('r', 'p', 'i', 'I', 'S')
      ORDER BY n.nspname, c.relname, c.relkind
    `)
  ]);

  return {
    namespaces,
    tables,
    columns: columns.map((row) => ({
      schema: String(row.schema),
      table: String(row.table),
      position: Number(row.position),
      name: String(row.name),
      dataType: String(row.dataType),
      databaseType: String(row.databaseType),
      nullable: Boolean(row.nullable),
      defaultExpression: row.defaultExpression === null ? null : String(row.defaultExpression),
      identity: row.identity === null ? null : String(row.identity),
      generated: row.generated === null ? null : String(row.generated)
    })),
    constraints: constraints.map((row) => ({
      schema: String(row.schema),
      table: String(row.table),
      name: String(row.name),
      type: String(row.type),
      definition: String(row.definition),
      columns: safeArray(row.columns),
      referencedSchema: row.referencedSchema === null ? null : String(row.referencedSchema),
      referencedTable: row.referencedTable === null ? null : String(row.referencedTable)
    })),
    indexes: indexes.map((row) => ({
      schema: String(row.schema),
      table: String(row.table),
      name: String(row.name),
      unique: requireBoolean(row.unique, 'index.unique'),
      primary: requireBoolean(row.primary, 'index.primary'),
      keyColumns: requireNullableStringArray(row.keyColumns, 'index.keyColumns'),
      includedColumns: requireStringArray(row.includedColumns, 'index.includedColumns'),
      hasExpressions: requireBoolean(row.hasExpressions, 'index.hasExpressions'),
      expression: row.expression === null ? null : String(row.expression),
      partial: requireBoolean(row.partial, 'index.partial'),
      predicate: row.predicate === null ? null : String(row.predicate),
      constraintBacked: requireBoolean(row.constraintBacked, 'index.constraintBacked'),
      definition: String(row.definition)
    })),
    enums: enums.map((item) => ({ ...item, values: safeArray(item.values) })),
    extensions,
    triggers,
    sequences: sequences.map((row) => ({
      schema: String(row.schema),
      name: String(row.name),
      dataType: String(row.dataType),
      start: String(row.start),
      increment: String(row.increment),
      minimum: String(row.minimum),
      maximum: String(row.maximum),
      cycle: Boolean(row.cycle)
    })),
    unsupportedObjects
  };
}
