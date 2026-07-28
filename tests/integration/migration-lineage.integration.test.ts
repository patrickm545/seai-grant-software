import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { verifyStrictLedger } from '../../lib/lineage-verifier';
import type { MigrationManifest } from '../../lib/migration-manifest';
import {
  readCatalogSnapshot,
  readConnectedDatabaseIdentity,
  readMigrationLedger
} from '../../lib/postgres-catalog';
import { assertNamedCatalog, fingerprintCatalog } from '../../lib/schema-fingerprint';

const prisma = new PrismaClient();
const manifest = JSON.parse(readFileSync('prisma/migration-manifest.json', 'utf8')) as MigrationManifest;

async function readOnce() {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return {
        identity: await readConnectedDatabaseIdentity(transaction),
        ledger: await readMigrationLedger(transaction),
        catalog: await readCatalogSnapshot(transaction)
      };
    },
    { isolationLevel: 'RepeatableRead' }
  );
}

test('disposable fresh database passes stable read-only inventory and catalog verification', async () => {
  const first = await readOnce();
  const second = await readOnce();
  assert.equal(first.identity.database_name, second.identity.database_name);
  assert.deepEqual(verifyStrictLedger(first.ledger, manifest).pending, []);
  assert.deepEqual(verifyStrictLedger(second.ledger, manifest).pending, []);
  assert.equal(fingerprintCatalog(first.catalog).fingerprint, fingerprintCatalog(second.catalog).fingerprint);
  assert.equal(assertNamedCatalog(first.catalog, 'fresh-head').results.length, 5);
});

async function findIndex(name: string) {
  const catalog = (await readOnce()).catalog;
  const index = catalog.indexes.find((item) => item.name === name);
  assert.ok(index, `Expected catalog index ${name}.`);
  return { catalog, index };
}

test('plain and formatting-varied single-column indexes are rejected structurally', async (context) => {
  const name = 'ADR0024 odd quoted index';
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "ADR0024 odd quoted index" ON public."Lead" ("followUpDate" DESC NULLS FIRST)'
  );
  context.after(() =>
    prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public."ADR0024 odd quoted index"')
  );
  const { catalog, index } = await findIndex(name);
  assert.deepEqual(index.keyColumns, ['followUpDate']);
  assert.deepEqual(index.includedColumns, []);
  assert.equal(index.hasExpressions, false);
  assert.equal(index.partial, false);
  assert.throws(() => assertNamedCatalog(catalog, 'fresh-head'), /index or constraint/);
});

test('unique and partial single-column indexes are rejected structurally', async (context) => {
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "ADR0024_unique_admin" ON public."Lead" ("assignedAdmin")'
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "ADR0024_partial_installer" ON public."Lead" ("assignedInstaller") WHERE "assignedInstaller" IS NOT NULL'
  );
  context.after(async () => {
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public."ADR0024_unique_admin"');
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public."ADR0024_partial_installer"');
  });
  const unique = await findIndex('ADR0024_unique_admin');
  assert.equal(unique.index.unique, true);
  assert.throws(() => assertNamedCatalog(unique.catalog, 'fresh-head'), /index or constraint/);
  await prisma.$executeRawUnsafe('DROP INDEX public."ADR0024_unique_admin"');
  const partial = await findIndex('ADR0024_partial_installer');
  assert.equal(partial.index.partial, true);
  assert.match(partial.index.predicate ?? '', /assignedInstaller/);
  assert.throws(() => assertNamedCatalog(partial.catalog, 'fresh-head'), /index or constraint/);
});

test('multi-column, expression, and INCLUDE metadata is structural and deterministic', async (context) => {
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "ADR0024_multi" ON public."Lead" ("internalNotes", "assignedAdmin")'
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "ADR0024_expression" ON public."Lead" (lower("internalNotes"))'
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "ADR0024_include" ON public."Lead" ("id") INCLUDE ("assignedInstaller")'
  );
  context.after(async () => {
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public."ADR0024_multi"');
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public."ADR0024_expression"');
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public."ADR0024_include"');
  });
  const first = await readOnce();
  const second = await readOnce();
  assert.equal(fingerprintCatalog(first.catalog).fingerprint, fingerprintCatalog(second.catalog).fingerprint);
  assert.equal(assertNamedCatalog(first.catalog, 'fresh-head').results.length, 5);
  const multi = first.catalog.indexes.find((item) => item.name === 'ADR0024_multi');
  const expression = first.catalog.indexes.find((item) => item.name === 'ADR0024_expression');
  const include = first.catalog.indexes.find((item) => item.name === 'ADR0024_include');
  assert.deepEqual(multi?.keyColumns, ['internalNotes', 'assignedAdmin']);
  assert.deepEqual(expression?.keyColumns, [null]);
  assert.equal(expression?.hasExpressions, true);
  assert.match(expression?.expression ?? '', /lower/);
  assert.deepEqual(include?.keyColumns, ['id']);
  assert.deepEqual(include?.includedColumns, ['assignedInstaller']);
});

test('constraint-backed dedicated index is identified and rejected', async (context) => {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE public."Lead" ADD CONSTRAINT "ADR0024_unique_installer" UNIQUE ("assignedInstaller")'
  );
  context.after(() =>
    prisma.$executeRawUnsafe(
      'ALTER TABLE public."Lead" DROP CONSTRAINT IF EXISTS "ADR0024_unique_installer"'
    )
  );
  const { catalog, index } = await findIndex('ADR0024_unique_installer');
  assert.equal(index.constraintBacked, true);
  assert.equal(index.unique, true);
  assert.deepEqual(index.keyColumns, ['assignedInstaller']);
  assert.throws(() => assertNamedCatalog(catalog, 'fresh-head'), /index or constraint/);
});

test.after(async () => {
  await prisma.$disconnect();
});
