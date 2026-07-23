-- Platform Release 1.5 PR 2: explicit lead origin, progressive unknowns,
-- trusted creator/assignment relations, and exact-match duplicate signals.

CREATE TYPE "LeadCreationOrigin" AS ENUM (
  'HOMEOWNER_INTAKE',
  'MANUAL_INSTALLER',
  'LEGACY_UNKNOWN'
);

ALTER TABLE "Lead"
ADD COLUMN "creationOrigin" "LeadCreationOrigin",
ADD COLUMN "createdByMembershipId" TEXT,
ADD COLUMN "assignedMembershipId" TEXT,
ADD COLUMN "manualCreationRequestId" TEXT,
ADD COLUMN "manualCreationInputHash" TEXT,
ADD COLUMN "normalisedEmail" TEXT,
ADD COLUMN "normalisedPhone" TEXT,
ADD COLUMN "normalisedEircode" TEXT;

-- Preserve source facts. These columns contain only derived exact-match keys.
UPDATE "Lead"
SET
  "normalisedEmail" = NULLIF(LOWER(BTRIM("email")), ''),
  "normalisedPhone" = NULLIF(REGEXP_REPLACE("phone", '[^0-9+]', '', 'g'), ''),
  "normalisedEircode" = NULLIF(REGEXP_REPLACE(UPPER("eircode"), '[^A-Z0-9]', '', 'g'), '');

-- Origin is backfilled only from authoritative creation evidence. Any row without
-- that evidence remains explicitly ambiguous rather than being guessed from its
-- customer fields, business source, completeness, status, or workflow stage.
UPDATE "Lead" AS lead
SET "creationOrigin" = CASE
  WHEN EXISTS (
    SELECT 1
    FROM "LeadActivity" AS activity
    WHERE activity."leadId" = lead."id"
      AND activity."type" = 'LEAD_CREATED'
      AND activity."metadata"->>'source' = 'public_intake'
  ) OR EXISTS (
    SELECT 1
    FROM "AuditLog" AS audit
    WHERE audit."leadId" = lead."id"
      AND audit."action" = 'lead.created'
      AND (audit."source" = 'public_intake' OR audit."metadataJson"->>'source' = 'public_intake')
  ) THEN 'HOMEOWNER_INTAKE'::"LeadCreationOrigin"
  WHEN EXISTS (
    SELECT 1
    FROM "AuditLog" AS audit
    WHERE audit."leadId" = lead."id"
      AND audit."action" = 'lead.created'
      AND audit."actorType" = 'HUMAN_USER'
      AND (audit."source" = 'manual_installer' OR audit."metadataJson"->>'origin' = 'MANUAL_INSTALLER')
  ) THEN 'MANUAL_INSTALLER'::"LeadCreationOrigin"
  ELSE 'LEGACY_UNKNOWN'::"LeadCreationOrigin"
END
WHERE "creationOrigin" IS NULL;

ALTER TABLE "Lead"
ALTER COLUMN "creationOrigin" SET NOT NULL,
-- Compatibility for a temporary application rollback: the baseline client does
-- not know this additive column. The current Prisma schema deliberately has no
-- default, so every current application write must still choose a truthful
-- HOMEOWNER_INTAKE or MANUAL_INSTALLER origin explicitly.
ALTER COLUMN "creationOrigin" SET DEFAULT 'LEGACY_UNKNOWN',
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "addressLine1" DROP NOT NULL,
ALTER COLUMN "county" DROP NOT NULL,
ALTER COLUMN "propertyOwner" DROP NOT NULL,
ALTER COLUMN "privateLandlord" DROP DEFAULT,
ALTER COLUMN "privateLandlord" DROP NOT NULL,
ALTER COLUMN "dwellingType" DROP NOT NULL,
ALTER COLUMN "yearBuilt" DROP NOT NULL,
ALTER COLUMN "mprn" DROP NOT NULL,
ALTER COLUMN "worksStarted" DROP NOT NULL,
ALTER COLUMN "priorSolarGrantAtMprn" DROP DEFAULT,
ALTER COLUMN "priorSolarGrantAtMprn" DROP NOT NULL,
ALTER COLUMN "consentToProcess" DROP NOT NULL,
ALTER COLUMN "consentToGrantAssist" DROP NOT NULL,
ALTER COLUMN "consentToContact" DROP DEFAULT,
ALTER COLUMN "consentToContact" DROP NOT NULL;

CREATE UNIQUE INDEX "OrganisationMembership_id_organisationId_key"
ON "OrganisationMembership"("id", "organisationId");

CREATE UNIQUE INDEX "Lead_manualCreationRequestId_key"
ON "Lead"("manualCreationRequestId");

CREATE INDEX "Lead_organisationId_normalisedEmail_idx"
ON "Lead"("organisationId", "normalisedEmail");

CREATE INDEX "Lead_organisationId_normalisedPhone_idx"
ON "Lead"("organisationId", "normalisedPhone");

CREATE INDEX "Lead_organisationId_normalisedEircode_idx"
ON "Lead"("organisationId", "normalisedEircode");

CREATE INDEX "Lead_organisationId_assignedMembershipId_idx"
ON "Lead"("organisationId", "assignedMembershipId");

CREATE INDEX "Lead_createdByMembershipId_idx"
ON "Lead"("createdByMembershipId");

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_createdByMembershipId_organisationId_fkey"
FOREIGN KEY ("createdByMembershipId", "organisationId")
REFERENCES "OrganisationMembership"("id", "organisationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_assignedMembershipId_organisationId_fkey"
FOREIGN KEY ("assignedMembershipId", "organisationId")
REFERENCES "OrganisationMembership"("id", "organisationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
