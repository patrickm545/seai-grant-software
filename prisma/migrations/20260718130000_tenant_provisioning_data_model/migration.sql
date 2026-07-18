-- Extend existing lifecycle enums without removing compatibility states.
ALTER TYPE "OrganisationStatus" ADD VALUE 'PROVISIONING' BEFORE 'ACTIVE';
ALTER TYPE "OrganisationStatus" ADD VALUE 'ARCHIVED';
ALTER TYPE "UserStatus" ADD VALUE 'INVITED' BEFORE 'ACTIVE';

CREATE TYPE "ProvisioningOperationStatus" AS ENUM (
  'PENDING',
  'VALIDATING',
  'READY',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

-- Existing users remain active and are not placed into a first-login state.
ALTER TABLE "User"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "temporaryCredentialExpiresAt" TIMESTAMP(3);

ALTER TABLE "User"
  ADD CONSTRAINT "User_invited_credential_state_check"
  CHECK (
    "status"::TEXT <> 'INVITED'
    OR (
      "passwordHash" IS NOT NULL
      AND "mustChangePassword" = true
      AND "temporaryCredentialExpiresAt" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "User_temporary_credential_expiry_check"
  CHECK (
    "temporaryCredentialExpiresAt" IS NULL
    OR "mustChangePassword" = true
  );

-- Add a persistent product-facing Installer slug while retaining the internal ID.
ALTER TABLE "Installer" ADD COLUMN "slug" TEXT;

WITH normalised AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        LEFT(
          TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')),
          48
        ),
        ''
      ),
      'installer'
    ) AS "baseSlug"
  FROM "Installer"
)
UPDATE "Installer" AS installer
SET "slug" = CONCAT(normalised."baseSlug", '-', SUBSTRING(MD5(installer."id") FROM 1 FOR 12))
FROM normalised
WHERE normalised."id" = installer."id";

ALTER TABLE "Installer" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Installer"
  ADD CONSTRAINT "Installer_slug_format_check"
  CHECK (
    "slug" = LOWER("slug")
    AND "slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND LENGTH("slug") <= 64
  );
CREATE UNIQUE INDEX "Installer_slug_key" ON "Installer"("slug");

-- Persist reviewed plans and approval identity without implementing execution behaviour.
CREATE TABLE "ProvisioningOperation" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "status" "ProvisioningOperationStatus" NOT NULL DEFAULT 'PENDING',
  "organisationId" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProvisioningOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProvisioningOperation_approval_check"
    CHECK (("approvedBy" IS NULL) = ("approvedAt" IS NULL))
);

CREATE UNIQUE INDEX "ProvisioningOperation_idempotencyKey_key"
  ON "ProvisioningOperation"("idempotencyKey");
CREATE INDEX "ProvisioningOperation_status_createdAt_idx"
  ON "ProvisioningOperation"("status", "createdAt");
CREATE INDEX "ProvisioningOperation_organisationId_idx"
  ON "ProvisioningOperation"("organisationId");
CREATE INDEX "ProvisioningOperation_approvedBy_idx"
  ON "ProvisioningOperation"("approvedBy");

ALTER TABLE "ProvisioningOperation"
  ADD CONSTRAINT "ProvisioningOperation_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProvisioningOperation"
  ADD CONSTRAINT "ProvisioningOperation_approvedBy_fkey"
  FOREIGN KEY ("approvedBy") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD COLUMN "provisioningOperationId" TEXT;
CREATE INDEX "AuditLog_provisioningOperationId_createdAt_idx"
  ON "AuditLog"("provisioningOperationId", "createdAt");
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_provisioningOperationId_fkey"
  FOREIGN KEY ("provisioningOperationId") REFERENCES "ProvisioningOperation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
