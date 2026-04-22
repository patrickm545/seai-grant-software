-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'NEEDS_REVIEW', 'READY_TO_APPLY', 'HOMEOWNER_REVIEW_PENDING', 'SUBMITTED', 'INSTALLATION_PENDING', 'PAYMENT_DOCS_PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DwellingType" AS ENUM ('DETACHED', 'SEMI_DETACHED', 'TERRACED', 'MID_TERRACE', 'END_TERRACE', 'APARTMENT', 'BUNGALOW', 'OTHER');

-- CreateTable
CREATE TABLE "Installer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seaiCompanyId" TEXT NOT NULL,
    "websiteDomain" TEXT,
    "county" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "county" TEXT NOT NULL,
    "eircode" TEXT,
    "propertyOwner" BOOLEAN NOT NULL,
    "privateLandlord" BOOLEAN NOT NULL DEFAULT false,
    "dwellingType" "DwellingType" NOT NULL,
    "yearBuilt" INTEGER NOT NULL,
    "yearOccupied" INTEGER,
    "mprn" TEXT NOT NULL,
    "worksStarted" BOOLEAN NOT NULL,
    "priorSolarGrantAtMprn" BOOLEAN NOT NULL DEFAULT false,
    "consentToProcess" BOOLEAN NOT NULL,
    "consentToGrantAssist" BOOLEAN NOT NULL,
    "consentToContact" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "aiSummary" TEXT,
    "likelyEligible" BOOLEAN,
    "eligibilityConfidence" DOUBLE PRECISION,
    "risksJson" JSONB,
    "missingItemsJson" JSONB,
    "structuredExportJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadDocument" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageUrl" TEXT,
    "extractedText" TEXT,
    "aiFieldsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDocument" ADD CONSTRAINT "LeadDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
