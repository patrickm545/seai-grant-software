-- Extend CRM activity events for customer portal and document review workflow.
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'DOCUMENT_APPROVED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'DOCUMENT_REJECTED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'DOCUMENT_NEEDS_REPLACEMENT';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'PORTAL_TOKEN_CREATED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'PORTAL_TOKEN_REGENERATED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'PORTAL_ACCESSED';

-- Customer portal access fields. Existing leads receive a token lazily when opened
-- in the installer dashboard; new intake leads receive one at creation time.
ALTER TABLE "Lead"
ADD COLUMN "portalToken" TEXT,
ADD COLUMN "portalTokenCreatedAt" TIMESTAMP(3),
ADD COLUMN "portalLastAccessedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Lead_portalToken_key" ON "Lead"("portalToken");

-- Document collection metadata and durable small-file storage foundation.
CREATE TYPE "LeadDocumentType" AS ENUM (
  'ELECTRICITY_BILL',
  'BER_CERTIFICATE',
  'PROPERTY_PHOTO',
  'ADDRESS_CONFIRMATION',
  'SIGNED_CONTRACT',
  'OTHER'
);

CREATE TYPE "LeadDocumentStatus" AS ENUM (
  'UPLOADED',
  'APPROVED',
  'REJECTED',
  'NEEDS_REPLACEMENT'
);

ALTER TABLE "LeadDocument"
ADD COLUMN "type" "LeadDocumentType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "originalFilename" TEXT,
ADD COLUMN "sizeBytes" INTEGER,
ADD COLUMN "storagePath" TEXT,
ADD COLUMN "contentBytes" BYTEA,
ADD COLUMN "uploadedBy" TEXT,
ADD COLUMN "uploadedByRole" TEXT,
ADD COLUMN "status" "LeadDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "LeadDocument"
SET
  "type" = CASE
    WHEN "aiFieldsJson" #>> '{documentKind}' = 'electricity_bill' THEN 'ELECTRICITY_BILL'::"LeadDocumentType"
    WHEN "aiFieldsJson" #>> '{documentKind}' = 'meter_photo' THEN 'ADDRESS_CONFIRMATION'::"LeadDocumentType"
    WHEN "aiFieldsJson" #>> '{documentKind}' = 'roof_photo' THEN 'PROPERTY_PHOTO'::"LeadDocumentType"
    ELSE 'OTHER'::"LeadDocumentType"
  END,
  "originalFilename" = COALESCE("originalFilename", "fileName"),
  "sizeBytes" = CASE
    WHEN jsonb_typeof("aiFieldsJson"->'sizeBytes') = 'number' THEN ("aiFieldsJson"->>'sizeBytes')::INTEGER
    ELSE "sizeBytes"
  END,
  "storagePath" = COALESCE("storagePath", "storageUrl"),
  "uploadedByRole" = COALESCE(
    "uploadedByRole",
    CASE
      WHEN "aiFieldsJson" #>> '{source}' = 'applicant_upload' THEN 'HOMEOWNER'
      ELSE 'ADMIN'
    END
  );

CREATE INDEX "LeadDocument_leadId_type_idx" ON "LeadDocument"("leadId", "type");
CREATE INDEX "LeadDocument_status_idx" ON "LeadDocument"("status");
CREATE INDEX "LeadDocument_createdAt_idx" ON "LeadDocument"("createdAt");
