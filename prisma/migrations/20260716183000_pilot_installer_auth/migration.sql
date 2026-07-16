-- Add installer verification and stable slugs without assuming existing names are unique.
ALTER TABLE "Organisation" ADD COLUMN "slug" TEXT;
ALTER TABLE "Organisation" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Organisation"
SET "slug" = CONCAT(
  COALESCE(
    NULLIF(
      LEFT(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')), 48),
      ''
    ),
    'organisation'
  ),
  '-',
  SUBSTRING(MD5("id") FROM 1 FOR 8)
);

ALTER TABLE "Organisation" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- Pilot credentials are optional for non-login service/internal users.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY LOWER(TRIM("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalise user emails: case-insensitive duplicates exist.';
  END IF;
END $$;

UPDATE "User" SET "email" = LOWER(TRIM("email"));
ALTER TABLE "User"
  ADD CONSTRAINT "User_email_normalised_check"
  CHECK ("email" = LOWER(TRIM("email")));

-- Remove only the known legacy shared-admin adapter memberships. It represented
-- one synthetic Clada identity across installer tenants and cannot become a pilot login.
DELETE FROM "OrganisationMembership" AS membership
USING "Organisation" AS organisation
WHERE membership."organisationId" = organisation."id"
  AND membership."userId" = 'user_clada_admin'
  AND organisation."type" = 'INSTALLER';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "OrganisationMembership"
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one organisation per user: duplicate memberships exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX "OrganisationMembership_userId_key"
  ON "OrganisationMembership"("userId");

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
