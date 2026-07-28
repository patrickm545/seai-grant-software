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

test.after(async () => {
  await prisma.$disconnect();
});
