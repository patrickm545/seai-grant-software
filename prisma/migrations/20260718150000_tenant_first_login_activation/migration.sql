-- Existing sessions remain normal sessions. Restricted first-login sessions
-- are explicitly identified so they cannot be accepted by normal route guards.
CREATE TYPE "AuthSessionType" AS ENUM ('NORMAL', 'RESTRICTED_FIRST_LOGIN');

ALTER TABLE "AuthSession"
  ADD COLUMN "sessionType" "AuthSessionType";

UPDATE "AuthSession"
SET "sessionType" = 'NORMAL'
WHERE "sessionType" IS NULL;

ALTER TABLE "AuthSession"
  ALTER COLUMN "sessionType" SET NOT NULL;

CREATE INDEX "AuthSession_userId_sessionType_expiresAt_idx"
  ON "AuthSession"("userId", "sessionType", "expiresAt");
