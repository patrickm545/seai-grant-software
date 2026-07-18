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
const platform12MigrationSql = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260710130000_users_roles_permissions_audit',
    'migration.sql'
  ),
  'utf8'
);
const platform13MigrationSql = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260710140000_workflow_foundation',
    'migration.sql'
  ),
  'utf8'
);
const pilotAuthMigrationSql = readFileSync(
  join(process.cwd(), 'prisma', 'migrations', '20260716183000_pilot_installer_auth', 'migration.sql'),
  'utf8'
);
const tenantProvisioningMigrationSql = readFileSync(
  join(process.cwd(), 'prisma', 'migrations', '20260718130000_tenant_provisioning_data_model', 'migration.sql'),
  'utf8'
);

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

test('platform 1.2 migration adds role and typed audit enums', () => {
  assert.match(platform12MigrationSql, /CREATE TYPE "PlatformRole" AS ENUM/);
  assert.match(platform12MigrationSql, /CREATE TYPE "AuditActorType" AS ENUM/);
  assert.match(platform12MigrationSql, /CREATE TYPE "AuditOutcome" AS ENUM/);
  assert.match(platform12MigrationSql, /ADD COLUMN "role" "PlatformRole" NOT NULL DEFAULT 'ORGANISATION_MEMBER'/);
});

test('platform 1.2 migration backfills bootstrap roles explicitly', () => {
  assert.match(platform12MigrationSql, /"role" = 'ORGANISATION_OWNER'::"PlatformRole"/);
  assert.match(platform12MigrationSql, /"role" = 'CLADA_INTERNAL_ADMIN'::"PlatformRole"/);
  assert.match(platform12MigrationSql, /"role" = 'ORGANISATION_ADMIN'::"PlatformRole"/);
  assert.match(platform12MigrationSql, /"userId" = 'user_clada_admin'/);
});

test('platform 1.2 migration preserves and backfills audit attribution', () => {
  assert.match(platform12MigrationSql, /ADD COLUMN "organisationId" TEXT/);
  assert.match(platform12MigrationSql, /ADD COLUMN "actorType" "AuditActorType"/);
  assert.match(platform12MigrationSql, /"resourceType" = 'lead'/);
  assert.match(platform12MigrationSql, /"AuditLog"\."leadId" = "Lead"\."id"/);
  assert.match(platform12MigrationSql, /'PUBLIC_TOKEN'::"AuditActorType"/);
  assert.match(platform12MigrationSql, /"outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCEEDED'/);
});

test('platform 1.3 migration creates workflow foundation tables', () => {
  assert.match(platform13MigrationSql, /CREATE TABLE "WorkflowDefinition"/);
  assert.match(platform13MigrationSql, /CREATE TABLE "WorkflowStage"/);
  assert.match(platform13MigrationSql, /CREATE TABLE "WorkflowTransition"/);
  assert.match(platform13MigrationSql, /CREATE TABLE "WorkflowInstance"/);
  assert.match(platform13MigrationSql, /CREATE TABLE "WorkflowHistory"/);
});

test('platform 1.3 migration enforces workflow referential consistency with composite keys', () => {
  assert.match(platform13MigrationSql, /"WorkflowStage_id_workflowDefinitionId_key"/);
  assert.match(platform13MigrationSql, /"WorkflowTransition_id_workflowDefinitionId_key"/);
  assert.match(platform13MigrationSql, /"WorkflowInstance_id_workflowDefinitionId_organisationId_key"/);
  assert.match(platform13MigrationSql, /FOREIGN KEY \("fromStageId", "workflowDefinitionId"\) REFERENCES "WorkflowStage"\("id", "workflowDefinitionId"\)/);
  assert.match(platform13MigrationSql, /FOREIGN KEY \("toStageId", "workflowDefinitionId"\) REFERENCES "WorkflowStage"\("id", "workflowDefinitionId"\)/);
  assert.match(platform13MigrationSql, /FOREIGN KEY \("currentStageId", "workflowDefinitionId"\) REFERENCES "WorkflowStage"\("id", "workflowDefinitionId"\)/);
  assert.match(platform13MigrationSql, /FOREIGN KEY \("workflowInstanceId", "workflowDefinitionId", "organisationId"\) REFERENCES "WorkflowInstance"\("id", "workflowDefinitionId", "organisationId"\)/);
  assert.match(platform13MigrationSql, /FOREIGN KEY \("transitionId", "workflowDefinitionId"\) REFERENCES "WorkflowTransition"\("id", "workflowDefinitionId"\)/);
  assert.match(platform13MigrationSql, /FOREIGN KEY \("previousStageId", "workflowDefinitionId"\) REFERENCES "WorkflowStage"\("id", "workflowDefinitionId"\)/);
  assert.match(platform13MigrationSql, /FOREIGN KEY \("nextStageId", "workflowDefinitionId"\) REFERENCES "WorkflowStage"\("id", "workflowDefinitionId"\)/);
});

test('platform 1.3 migration seeds lead pipeline workflow definitions and transition permission', () => {
  assert.match(platform13MigrationSql, /solargrant\.lead_pipeline/);
  assert.match(platform13MigrationSql, /NEW_LEAD/);
  assert.match(platform13MigrationSql, /QUOTE_SENT/);
  assert.match(platform13MigrationSql, /lead\.change_status/);
  assert.match(platform13MigrationSql, /compatibilityGraph/);
});

test('platform 1.3 migration backfills workflow instances without fabricated history', () => {
  assert.match(platform13MigrationSql, /INSERT INTO "WorkflowInstance"/);
  assert.match(platform13MigrationSql, /"Lead"\."pipelineStage"::TEXT/);
  assert.match(platform13MigrationSql, /historyBackfilled', false/);
  assert.doesNotMatch(platform13MigrationSql, /INSERT INTO "WorkflowHistory"/);
});

test('pilot auth migration adds verification, normalised identity, and durable sessions', () => {
  assert.match(pilotAuthMigrationSql, /ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(pilotAuthMigrationSql, /"User_email_normalised_check"/);
  assert.match(pilotAuthMigrationSql, /CREATE TABLE "AuthSession"/);
  assert.match(pilotAuthMigrationSql, /"AuthSession_userId_fkey"/);
});

test('pilot auth migration enforces exactly one organisation membership per user', () => {
  assert.match(pilotAuthMigrationSql, /DELETE FROM "OrganisationMembership" AS membership/);
  assert.match(pilotAuthMigrationSql, /Cannot enforce one organisation per user/);
  assert.match(pilotAuthMigrationSql, /CREATE UNIQUE INDEX "OrganisationMembership_userId_key"/);
});

test('tenant provisioning migration adds lifecycle and first-login credential state safely', () => {
  assert.match(tenantProvisioningMigrationSql, /ALTER TYPE "OrganisationStatus" ADD VALUE 'PROVISIONING'/);
  assert.match(tenantProvisioningMigrationSql, /ALTER TYPE "OrganisationStatus" ADD VALUE 'ARCHIVED'/);
  assert.match(tenantProvisioningMigrationSql, /ALTER TYPE "UserStatus" ADD VALUE 'INVITED'/);
  assert.match(tenantProvisioningMigrationSql, /"mustChangePassword" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(tenantProvisioningMigrationSql, /"temporaryCredentialExpiresAt" TIMESTAMP\(3\)/);
  assert.match(tenantProvisioningMigrationSql, /"User_invited_credential_state_check"/);
});

test('tenant provisioning migration backfills and constrains a unique installer slug', () => {
  const slugBackfillIndex = tenantProvisioningMigrationSql.indexOf('UPDATE "Installer" AS installer');
  const slugNotNullIndex = tenantProvisioningMigrationSql.indexOf('ALTER COLUMN "slug" SET NOT NULL');

  assert.ok(slugBackfillIndex > -1, 'installer slug backfill is present');
  assert.ok(slugNotNullIndex > slugBackfillIndex, 'installer slug is required only after backfill');
  assert.match(tenantProvisioningMigrationSql, /"Installer_slug_format_check"/);
  assert.match(tenantProvisioningMigrationSql, /CREATE UNIQUE INDEX "Installer_slug_key"/);
});

test('tenant provisioning migration persists idempotency, approval, and audit correlation', () => {
  assert.match(tenantProvisioningMigrationSql, /CREATE TABLE "ProvisioningOperation"/);
  assert.match(tenantProvisioningMigrationSql, /"idempotencyKey" TEXT NOT NULL/);
  assert.match(tenantProvisioningMigrationSql, /"ProvisioningOperation_idempotencyKey_key"/);
  assert.match(tenantProvisioningMigrationSql, /"approvedBy" TEXT/);
  assert.match(tenantProvisioningMigrationSql, /"approvedAt" TIMESTAMP\(3\)/);
  assert.match(tenantProvisioningMigrationSql, /"ProvisioningOperation_approvedBy_fkey"/);
  assert.match(tenantProvisioningMigrationSql, /"AuditLog_provisioningOperationId_fkey"/);
});

test('tenant provisioning migration preserves the single-organisation membership constraint', () => {
  assert.doesNotMatch(tenantProvisioningMigrationSql, /DROP INDEX "OrganisationMembership_userId_key"/);
  assert.doesNotMatch(tenantProvisioningMigrationSql, /DROP CONSTRAINT.*OrganisationMembership/);
});
