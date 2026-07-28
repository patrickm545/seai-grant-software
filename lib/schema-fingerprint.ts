import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json';

export const SCHEMA_FINGERPRINT_VERSION = 'clada-postgres-schema-fingerprint/v2' as const;
export const NAMED_ASSERTIONS_VERSION = 'adr-0024-catalog-assertions/v2' as const;

export type CatalogSnapshot = {
  namespaces: Array<{ name: string }>;
  tables: Array<{ schema: string; name: string; kind: string }>;
  columns: Array<{
    schema: string;
    table: string;
    position: number;
    name: string;
    dataType: string;
    databaseType: string;
    nullable: boolean;
    defaultExpression: string | null;
    identity: string | null;
    generated: string | null;
  }>;
  constraints: Array<{
    schema: string;
    table: string;
    name: string;
    type: string;
    definition: string;
    columns: string[];
    referencedSchema: string | null;
    referencedTable: string | null;
  }>;
  indexes: Array<{
    schema: string;
    table: string;
    name: string;
    unique: boolean;
    primary: boolean;
    keyColumns: Array<string | null>;
    includedColumns: string[];
    hasExpressions: boolean;
    expression: string | null;
    partial: boolean;
    predicate: string | null;
    constraintBacked: boolean;
    definition: string;
  }>;
  enums: Array<{ schema: string; name: string; values: string[] }>;
  extensions: Array<{ name: string; version: string; schema: string }>;
  triggers: Array<{
    schema: string;
    table: string;
    name: string;
    enabled: string;
    definition: string;
  }>;
  sequences: Array<{
    schema: string;
    name: string;
    dataType: string;
    start: string;
    increment: string;
    minimum: string;
    maximum: string;
    cycle: boolean;
  }>;
  unsupportedObjects: Array<{ schema: string; name: string; kind: string }>;
};

function sortByCanonical<T>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftValue = canonicalJson(left);
    const rightValue = canonicalJson(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  });
}

export function canonicaliseCatalog(snapshot: CatalogSnapshot) {
  const withoutPrismaTable = (value: { schema?: string; table?: string; name?: string }) =>
    value.schema !== 'public' || (value.table ?? value.name) !== '_prisma_migrations';
  return {
    version: SCHEMA_FINGERPRINT_VERSION,
    scope: ['public'],
    exclusions: [
      'public._prisma_migrations (verified separately as the migration ledger)',
      'object OIDs',
      'owner and ACL metadata',
      'creation timestamps',
      'planner statistics',
      'physical storage and tablespace metadata'
    ],
    namespaces: sortByCanonical(snapshot.namespaces),
    tables: sortByCanonical(snapshot.tables.filter(withoutPrismaTable)),
    columns: sortByCanonical(snapshot.columns.filter(withoutPrismaTable)),
    constraints: sortByCanonical(
      snapshot.constraints
        .filter(withoutPrismaTable)
        .map((item) => ({ ...item, columns: [...item.columns] }))
    ),
    indexes: sortByCanonical(snapshot.indexes.filter(withoutPrismaTable)),
    enums: sortByCanonical(snapshot.enums.map((item) => ({ ...item, values: [...item.values] }))),
    extensions: sortByCanonical(snapshot.extensions),
    triggers: sortByCanonical(snapshot.triggers.filter(withoutPrismaTable)),
    sequences: sortByCanonical(snapshot.sequences),
    unsupportedObjects: sortByCanonical(snapshot.unsupportedObjects)
  };
}

export function fingerprintCatalog(snapshot: CatalogSnapshot) {
  const canonical = canonicaliseCatalog(snapshot);
  return {
    version: SCHEMA_FINGERPRINT_VERSION,
    canonical,
    fingerprint: createHash('sha256').update(canonicalJson(canonical)).digest('hex')
  };
}

export type SchemaProfile = 'pre-password-reset' | 'post-password-reset' | 'fresh-head';

export function assertNamedCatalog(snapshot: CatalogSnapshot, profile: SchemaProfile) {
  const expectedLeadColumns = new Map([
    ['internalNotes', 'text'],
    ['followUpDate', 'timestamp without time zone'],
    ['assignedAdmin', 'text'],
    ['assignedInstaller', 'text']
  ]);
  const results: Array<{ assertion: string; passed: true }> = [];
  for (const [name, dataType] of expectedLeadColumns) {
    const matches = snapshot.columns.filter(
      (column) => column.schema === 'public' && column.table === 'Lead' && column.name === name
    );
    if (matches.length !== 1) throw new Error(`Named catalog assertion failed: Lead.${name} must exist once.`);
    const column = matches[0];
    if (!column.nullable || column.dataType !== dataType || column.defaultExpression !== null) {
      throw new Error(`Named catalog assertion failed: Lead.${name} type/nullability/default differs.`);
    }
    const dedicatedIndex = snapshot.indexes.some(
      (index) =>
        index.schema === 'public' &&
        index.table === 'Lead' &&
        index.keyColumns.length === 1 &&
        index.keyColumns[0] === name
    );
    const dedicatedConstraint = snapshot.constraints.some(
      (constraint) =>
        constraint.schema === 'public' &&
        constraint.table === 'Lead' &&
        constraint.columns.length === 1 &&
        constraint.columns[0] === name
    );
    if (dedicatedIndex || dedicatedConstraint) {
      throw new Error(`Named catalog assertion failed: Lead.${name} has a dedicated index or constraint.`);
    }
    results.push({ assertion: `Lead.${name}:nullable-${dataType}-no-default-index-constraint`, passed: true });
  }

  const resetTableCount = snapshot.tables.filter(
    (table) => table.schema === 'public' && table.name === 'PasswordResetRequest'
  ).length;
  if (profile === 'pre-password-reset' && resetTableCount !== 0) {
    throw new Error('Named catalog assertion failed: PasswordResetRequest must be absent before migration.');
  }
  if (profile !== 'pre-password-reset' && resetTableCount !== 1) {
    throw new Error('Named catalog assertion failed: PasswordResetRequest must exist after migration.');
  }
  results.push({
    assertion:
      profile === 'pre-password-reset'
        ? 'PasswordResetRequest:absent'
        : 'PasswordResetRequest:present',
    passed: true
  });
  return { version: NAMED_ASSERTIONS_VERSION, profile, results };
}
