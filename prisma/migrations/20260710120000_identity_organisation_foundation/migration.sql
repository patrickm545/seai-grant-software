-- Platform Release 1.1: Identity and Organisation Foundation.
-- Existing SolarGRANT Pro records are assigned to installer organisations by
-- deriving ownership from the current Lead.installerId relationship.

CREATE TYPE "OrganisationType" AS ENUM ('CLADA_INTERNAL', 'INSTALLER');
CREATE TYPE "OrganisationStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "OrganisationMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganisationType" NOT NULL,
    "status" "OrganisationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganisationMembership" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrganisationMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationMembership_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Installer" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "organisationId" TEXT;

INSERT INTO "Organisation" ("id", "name", "type", "status", "createdAt", "updatedAt")
VALUES ('org_clada_internal', 'Clada Systems', 'CLADA_INTERNAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "User" ("id", "email", "displayName", "status", "createdAt", "updatedAt")
VALUES ('user_clada_admin', 'admin@clada.local', 'Clada Admin', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "OrganisationMembership" ("id", "organisationId", "userId", "status", "isOwner", "createdAt", "updatedAt")
VALUES ('membership_clada_admin_internal', 'org_clada_internal', 'user_clada_admin', 'ACTIVE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Organisation" ("id", "name", "type", "status", "createdAt", "updatedAt")
SELECT
    'org_installer_' || "id",
    "name",
    'INSTALLER'::"OrganisationType",
    'ACTIVE'::"OrganisationStatus",
    COALESCE("createdAt", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "Installer";

UPDATE "Installer"
SET "organisationId" = 'org_installer_' || "id"
WHERE "organisationId" IS NULL;

INSERT INTO "OrganisationMembership" ("id", "organisationId", "userId", "status", "isOwner", "createdAt", "updatedAt")
SELECT
    'membership_clada_admin_' || "id",
    "organisationId",
    'user_clada_admin',
    'ACTIVE'::"OrganisationMembershipStatus",
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Installer"
WHERE "organisationId" IS NOT NULL;

UPDATE "Lead"
SET "organisationId" = "Installer"."organisationId"
FROM "Installer"
WHERE "Lead"."installerId" = "Installer"."id";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Installer" WHERE "organisationId" IS NULL) THEN
        RAISE EXCEPTION 'Identity organisation migration failed: installer without organisation owner';
    END IF;

    IF EXISTS (SELECT 1 FROM "Lead" WHERE "organisationId" IS NULL) THEN
        RAISE EXCEPTION 'Identity organisation migration failed: lead without organisation owner';
    END IF;
END $$;

ALTER TABLE "Installer" ALTER COLUMN "organisationId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "organisationId" SET NOT NULL;

ALTER TABLE "InstallerQuotePricing" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "LeadDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Lead"
        LEFT JOIN "Installer"
            ON "Lead"."installerId" = "Installer"."id"
            AND "Lead"."organisationId" = "Installer"."organisationId"
        WHERE "Installer"."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Identity organisation migration failed: lead installer ownership mismatch';
    END IF;
END $$;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "OrganisationMembership_organisationId_userId_key" ON "OrganisationMembership"("organisationId", "userId");
CREATE UNIQUE INDEX "Installer_id_organisationId_key" ON "Installer"("id", "organisationId");
CREATE INDEX "Organisation_type_status_idx" ON "Organisation"("type", "status");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "OrganisationMembership_userId_status_idx" ON "OrganisationMembership"("userId", "status");
CREATE INDEX "OrganisationMembership_organisationId_status_idx" ON "OrganisationMembership"("organisationId", "status");
CREATE INDEX "Installer_organisationId_idx" ON "Installer"("organisationId");
CREATE INDEX "Lead_organisationId_createdAt_idx" ON "Lead"("organisationId", "createdAt");
CREATE INDEX "Lead_organisationId_installerId_idx" ON "Lead"("organisationId", "installerId");

ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Installer" ADD CONSTRAINT "Installer_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_installerId_fkey";
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_installerId_organisationId_fkey" FOREIGN KEY ("installerId", "organisationId") REFERENCES "Installer"("id", "organisationId") ON DELETE RESTRICT ON UPDATE CASCADE;
