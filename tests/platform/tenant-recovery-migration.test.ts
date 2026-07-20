import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
const migration = readFileSync(join(process.cwd(), 'prisma', 'migrations', '20260720100000_tenant_operator_recovery', 'migration.sql'), 'utf8');
const service = readFileSync(join(process.cwd(), 'lib', 'tenant-recovery.ts'), 'utf8');

test('recovery operations have a durable typed model and non-destructive migration', () => {
  assert.match(schema, /enum ProvisioningOperationType[\s\S]*RECOVERY_CREDENTIAL_REISSUE/);
  assert.match(schema, /operationType\s+ProvisioningOperationType\s+@default\(PROVISIONING\)/);
  assert.match(migration, /CREATE TYPE "ProvisioningOperationType" AS ENUM/);
  assert.match(migration, /ADD COLUMN "operationType" "ProvisioningOperationType" NOT NULL DEFAULT 'PROVISIONING'/);
  assert.match(migration, /ProvisioningOperation_operationType_status_idx/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
});

test('recovery service keeps credentials and session material outside safe output and audit metadata', () => {
  assert.match(service, /generateTemporaryCredential/);
  assert.match(service, /hashPilotPassword/);
  assert.match(service, /CREDENTIAL_REISSUE_STARTED|CREDENTIAL_REISSUE_DELIVERED|CREDENTIAL_REISSUE_FAILED/);
  assert.match(service, /PREVIOUS_CREDENTIAL_REVOKED/);
  assert.doesNotMatch(service, /console\.(log|error).*credential/i);
  assert.doesNotMatch(service, /metadata:.*(passwordHash|tokenHash|temporaryCredential)/i);
});
