ALTER TABLE "Lead"
ADD COLUMN "currentCrmProcess" TEXT,
ADD COLUMN "installerSize" TEXT,
ADD COLUMN "objections" TEXT,
ADD COLUMN "painPoints" TEXT,
ADD COLUMN "likelihoodToBuy" TEXT,
ADD COLUMN "leadSource" TEXT,
ADD COLUMN "researchCallCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "salesCallRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_leadId_idx" ON "AuditLog"("leadId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
