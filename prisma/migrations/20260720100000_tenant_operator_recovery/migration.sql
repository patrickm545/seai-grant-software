-- Durable operation type keeps recovery idempotency records distinct from
-- provisioning while preserving all existing operation rows.
CREATE TYPE "ProvisioningOperationType" AS ENUM (
  'PROVISIONING',
  'RECOVERY_CREDENTIAL_REISSUE',
  'RECOVERY_SUSPEND_USER',
  'RECOVERY_SUSPEND_ORGANISATION',
  'RECOVERY_REACTIVATE_USER',
  'RECOVERY_REACTIVATE_ORGANISATION'
);

ALTER TABLE "ProvisioningOperation"
  ADD COLUMN "operationType" "ProvisioningOperationType",
  ADD COLUMN "resultSnapshot" JSONB;

UPDATE "ProvisioningOperation"
SET "operationType" = 'PROVISIONING'
WHERE "operationType" IS NULL;

ALTER TABLE "ProvisioningOperation"
  ALTER COLUMN "operationType" SET NOT NULL;

CREATE INDEX "ProvisioningOperation_operationType_status_idx"
  ON "ProvisioningOperation"("operationType", "status");
