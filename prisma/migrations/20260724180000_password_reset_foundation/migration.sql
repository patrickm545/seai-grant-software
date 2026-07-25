-- CreateEnum
CREATE TYPE "PasswordResetStatus" AS ENUM ('PENDING', 'DISPATCHED', 'EXCHANGED', 'CONSUMED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PasswordResetRevocationReason" AS ENUM ('SUPERSEDED', 'DELIVERY_FAILED', 'ADMINISTRATIVE');

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenDigest" TEXT NOT NULL,
    "exchangeDigest" TEXT,
    "status" "PasswordResetStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "dispatchedAt" TIMESTAMP(3),
    "exchangedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revocationReason" "PasswordResetRevocationReason",
    "providerName" TEXT,
    "providerReceiptId" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequest_tokenDigest_key" ON "PasswordResetRequest"("tokenDigest");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequest_exchangeDigest_key" ON "PasswordResetRequest"("exchangeDigest");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequest_correlationId_key" ON "PasswordResetRequest"("correlationId");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_userId_status_createdAt_idx" ON "PasswordResetRequest"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_expiresAt_idx" ON "PasswordResetRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_status_updatedAt_idx" ON "PasswordResetRequest"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
