-- CreateEnum
CREATE TYPE "LeadPipelineStage" AS ENUM ('NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'SURVEY_BOOKED', 'SURVEY_COMPLETED', 'QUOTE_SENT', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadScore" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('LEAD_CREATED', 'STAGE_CHANGED', 'SCORE_UPDATED', 'NOTE_ADDED', 'EMAIL_SENT', 'SMS_SENT', 'DOCUMENT_UPLOADED', 'PROPOSAL_VIEWED', 'QUOTE_SENT', 'FOLLOW_UP_SET', 'SYSTEM_EVENT');

-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN "pipelineStage" "LeadPipelineStage" NOT NULL DEFAULT 'NEW_LEAD',
ADD COLUMN "leadScore" "LeadScore" NOT NULL DEFAULT 'WARM',
ADD COLUMN "lastContactedAt" TIMESTAMP(3),
ADD COLUMN "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN "scoreUpdatedAt" TIMESTAMP(3);

UPDATE "Lead"
SET "leadScore" = CASE
  WHEN "structuredExportJson" #>> '{salesSignal,leadTemperature}' = 'HOT' THEN 'HOT'::"LeadScore"
  WHEN "structuredExportJson" #>> '{salesSignal,leadTemperature}' = 'COLD' THEN 'COLD'::"LeadScore"
  ELSE 'WARM'::"LeadScore"
END,
"scoreUpdatedAt" = CURRENT_TIMESTAMP;

UPDATE "Lead"
SET "nextFollowUpAt" = "followUpDate"
WHERE "followUpDate" IS NOT NULL;

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdByRole" TEXT,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_type_idx" ON "LeadActivity"("type");

-- CreateIndex
CREATE INDEX "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
