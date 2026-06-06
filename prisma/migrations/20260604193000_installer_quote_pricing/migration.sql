ALTER TABLE "Lead"
DROP COLUMN IF EXISTS "quoteCostBreakdown",
ADD COLUMN IF NOT EXISTS "generatedQuoteJson" JSONB;

CREATE TABLE "InstallerQuotePricing" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "panelUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 320,
    "panelKwCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "batteryUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "batteryKwhCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inverterCost" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "mountingCost" DOUBLE PRECISION NOT NULL DEFAULT 850,
    "wiringCost" DOUBLE PRECISION NOT NULL DEFAULT 450,
    "safetyEquipmentCost" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "baseLabourCost" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "labourPerPanel" DOUBLE PRECISION NOT NULL DEFAULT 65,
    "labourPerKw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricalWorkCost" DOUBLE PRECISION NOT NULL DEFAULT 650,
    "surveyAdminCost" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "miscellaneousCost" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "optionalExtrasCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markupPercentage" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "vatPercentage" DOUBLE PRECISION NOT NULL DEFAULT 13.5,
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountFixedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumQuotePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallerQuotePricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstallerQuotePricing_installerId_key" ON "InstallerQuotePricing"("installerId");
CREATE INDEX "InstallerQuotePricing_installerId_idx" ON "InstallerQuotePricing"("installerId");

ALTER TABLE "InstallerQuotePricing"
ADD CONSTRAINT "InstallerQuotePricing_installerId_fkey"
FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "InstallerQuotePricing" (
    "id",
    "installerId",
    "panelUnitCost",
    "panelKwCost",
    "batteryUnitCost",
    "batteryKwhCost",
    "inverterCost",
    "mountingCost",
    "wiringCost",
    "safetyEquipmentCost",
    "baseLabourCost",
    "labourPerPanel",
    "labourPerKw",
    "electricalWorkCost",
    "surveyAdminCost",
    "miscellaneousCost",
    "optionalExtrasCost",
    "markupPercentage",
    "vatPercentage",
    "discountPercentage",
    "discountFixedAmount",
    "minimumQuotePrice",
    "travelCost",
    "createdAt",
    "updatedAt"
)
SELECT
    'pricing_' || md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    320,
    0,
    3500,
    0,
    1200,
    850,
    450,
    350,
    1200,
    65,
    0,
    650,
    250,
    300,
    0,
    12,
    13.5,
    0,
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Installer"
ON CONFLICT ("installerId") DO NOTHING;
