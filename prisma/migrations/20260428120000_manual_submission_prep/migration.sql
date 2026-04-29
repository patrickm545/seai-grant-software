ALTER TABLE "Lead"
ADD COLUMN "internalNotes" TEXT,
ADD COLUMN "followUpDate" TIMESTAMP(3),
ADD COLUMN "assignedAdmin" TEXT,
ADD COLUMN "assignedInstaller" TEXT;
