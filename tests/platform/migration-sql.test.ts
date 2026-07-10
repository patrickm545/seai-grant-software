import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const migrationPath = join(
  process.cwd(),
  'prisma',
  'migrations',
  '20260710120000_identity_organisation_foundation',
  'migration.sql'
);

const migrationSql = readFileSync(migrationPath, 'utf8');

test('migration creates identity and organisation tables', () => {
  assert.match(migrationSql, /CREATE TABLE "Organisation"/);
  assert.match(migrationSql, /CREATE TABLE "User"/);
  assert.match(migrationSql, /CREATE TABLE "OrganisationMembership"/);
});

test('migration backfills installer and lead organisation ownership before enforcing not null', () => {
  const updateLeadIndex = migrationSql.indexOf('UPDATE "Lead"');
  const leadNotNullIndex = migrationSql.indexOf('ALTER TABLE "Lead" ALTER COLUMN "organisationId" SET NOT NULL');

  assert.ok(updateLeadIndex > -1, 'lead ownership backfill is present');
  assert.ok(leadNotNullIndex > updateLeadIndex, 'lead ownership is enforced only after backfill');
  assert.match(migrationSql, /SET "organisationId" = "Installer"\."organisationId"/);
});

test('migration fails closed when existing ownership cannot be derived', () => {
  assert.match(migrationSql, /lead without organisation owner/);
  assert.match(migrationSql, /installer without organisation owner/);
  assert.match(migrationSql, /lead installer ownership mismatch/);
});

test('migration creates default internal context and installer memberships', () => {
  assert.match(migrationSql, /org_clada_internal/);
  assert.match(migrationSql, /user_clada_admin/);
  assert.match(migrationSql, /membership_clada_admin_internal/);
  assert.match(migrationSql, /membership_clada_admin_/);
});

test('migration enforces lead and installer ownership consistency', () => {
  assert.match(migrationSql, /CREATE UNIQUE INDEX "Installer_id_organisationId_key" ON "Installer"\("id", "organisationId"\)/);
  assert.match(migrationSql, /DROP CONSTRAINT "Lead_installerId_fkey"/);
  assert.match(migrationSql, /"Lead_installerId_organisationId_fkey"/);
  assert.match(migrationSql, /FOREIGN KEY \("installerId", "organisationId"\) REFERENCES "Installer"\("id", "organisationId"\)/);
});

test('migration keeps updatedAt columns aligned with Prisma updatedAt semantics', () => {
  assert.match(migrationSql, /"Organisation"[\s\S]*"updatedAt" TIMESTAMP\(3\) NOT NULL,/);
  assert.match(migrationSql, /"User"[\s\S]*"updatedAt" TIMESTAMP\(3\) NOT NULL,/);
  assert.match(migrationSql, /"OrganisationMembership"[\s\S]*"updatedAt" TIMESTAMP\(3\) NOT NULL,/);
  assert.match(migrationSql, /ALTER TABLE "InstallerQuotePricing" ALTER COLUMN "updatedAt" DROP DEFAULT/);
  assert.match(migrationSql, /ALTER TABLE "LeadDocument" ALTER COLUMN "updatedAt" DROP DEFAULT/);
});
