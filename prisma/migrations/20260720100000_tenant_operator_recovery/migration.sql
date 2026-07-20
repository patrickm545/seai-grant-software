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
  ADD COLUMN "operationType" "ProvisioningOperationType" NOT NULL DEFAULT 'PROVISIONING';

CREATE INDEX "ProvisioningOperation_operationType_status_idx"
  ON "ProvisioningOperation"("operationType", "status");
