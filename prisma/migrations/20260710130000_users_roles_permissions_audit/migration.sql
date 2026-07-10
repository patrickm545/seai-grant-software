-- Platform Release 1.2: Users, roles, permissions, and actor-aware audit foundation.
-- This migration preserves Platform Release 1.1 tenant ownership guarantees and
-- keeps legacy audit/activity attribution fields during the compatibility period.

CREATE TYPE "PlatformRole" AS ENUM (
    'ORGANISATION_OWNER',
    'ORGANISATION_ADMIN',
    'ORGANISATION_MEMBER',
    'CLADA_INTERNAL_ADMIN',
    'CLADA_INTERNAL_SUPPORT',
    'SERVICE_ACTOR',
    'SYSTEM_ACTOR'
);

CREATE TYPE "AuditActorType" AS ENUM (
    'HUMAN_USER',
    'SYSTEM',
    'SERVICE',
    'PUBLIC_TOKEN'
);

CREATE TYPE "AuditOutcome" AS ENUM (
    'SUCCEEDED',
    'DENIED',
    'FAILED'
);

ALTER TABLE "OrganisationMembership"
    ADD COLUMN "role" "PlatformRole" NOT NULL DEFAULT 'ORGANISATION_MEMBER';

UPDATE "OrganisationMembership"
SET "role" = 'ORGANISATION_OWNER'::"PlatformRole"
WHERE "isOwner" = true;

UPDATE "OrganisationMembership"
SET "role" = 'CLADA_INTERNAL_ADMIN'::"PlatformRole"
WHERE "organisationId" = 'org_clada_internal'
  AND "userId" = 'user_clada_admin';

UPDATE "OrganisationMembership"
SET "role" = 'ORGANISATION_ADMIN'::"PlatformRole"
WHERE "userId" = 'user_clada_admin'
  AND "organisationId" <> 'org_clada_internal';

ALTER TABLE "AuditLog"
    ADD COLUMN "organisationId" TEXT,
    ADD COLUMN "actorType" "AuditActorType",
    ADD COLUMN "userId" TEXT,
    ADD COLUMN "membershipId" TEXT,
    ADD COLUMN "resourceType" TEXT,
    ADD COLUMN "resourceId" TEXT,
    ADD COLUMN "source" TEXT,
    ADD COLUMN "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCEEDED';

ALTER TABLE "LeadActivity"
    ADD COLUMN "actorType" "AuditActorType",
    ADD COLUMN "actorUserId" TEXT,
    ADD COLUMN "actorMembershipId" TEXT,
    ADD COLUMN "actorOrganisationId" TEXT;

UPDATE "AuditLog"
SET
    "resourceType" = 'lead',
    "resourceId" = "leadId"
WHERE "leadId" IS NOT NULL;

UPDATE "AuditLog"
SET "organisationId" = "Lead"."organisationId"
FROM "Lead"
WHERE "AuditLog"."leadId" = "Lead"."id"
  AND "AuditLog"."organisationId" IS NULL;

UPDATE "AuditLog"
SET "actorType" = CASE
    WHEN lower("actor") IN ('homeowner', 'customer portal', 'public intake') THEN 'PUBLIC_TOKEN'::"AuditActorType"
    WHEN lower("actor") IN ('system', 'clada os') THEN 'SYSTEM'::"AuditActorType"
    WHEN lower("actor") IN ('service') THEN 'SERVICE'::"AuditActorType"
    ELSE 'HUMAN_USER'::"AuditActorType"
END
WHERE "actorType" IS NULL;

UPDATE "AuditLog"
SET "source" = CASE
    WHEN "actorType" = 'PUBLIC_TOKEN'::"AuditActorType" THEN 'public_token'
    WHEN "actorType" = 'SYSTEM'::"AuditActorType" THEN 'system'
    ELSE 'authenticated'
END
WHERE "source" IS NULL;

UPDATE "LeadActivity"
SET "actorOrganisationId" = "Lead"."organisationId"
FROM "Lead"
WHERE "LeadActivity"."leadId" = "Lead"."id"
  AND "LeadActivity"."actorOrganisationId" IS NULL;

UPDATE "LeadActivity"
SET "actorType" = CASE
    WHEN upper(COALESCE("createdByRole", '')) = 'HOMEOWNER' THEN 'PUBLIC_TOKEN'::"AuditActorType"
    WHEN upper(COALESCE("createdByRole", '')) = 'SYSTEM' THEN 'SYSTEM'::"AuditActorType"
    WHEN upper(COALESCE("createdByRole", '')) = 'SERVICE' THEN 'SERVICE'::"AuditActorType"
    ELSE 'HUMAN_USER'::"AuditActorType"
END
WHERE "actorType" IS NULL;

CREATE INDEX "OrganisationMembership_role_idx" ON "OrganisationMembership"("role");
CREATE INDEX "LeadActivity_actorOrganisationId_createdAt_idx" ON "LeadActivity"("actorOrganisationId", "createdAt");
CREATE INDEX "LeadActivity_actorUserId_idx" ON "LeadActivity"("actorUserId");
CREATE INDEX "AuditLog_organisationId_createdAt_idx" ON "AuditLog"("organisationId", "createdAt");
CREATE INDEX "AuditLog_actorType_idx" ON "AuditLog"("actorType");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_membershipId_idx" ON "AuditLog"("membershipId");
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");
CREATE INDEX "AuditLog_outcome_idx" ON "AuditLog"("outcome");
