import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationSql = readFileSync(
  'prisma/migrations/20260724180000_password_reset_foundation/migration.sql',
  'utf8'
);
const schema = readFileSync('prisma/schema.prisma', 'utf8');

test('password reset migration is one additive generated foundation migration', () => {
  assert.match(migrationSql, /CREATE TYPE "PasswordResetStatus"/);
  assert.match(migrationSql, /CREATE TYPE "PasswordResetRevocationReason"/);
  assert.match(migrationSql, /CREATE TABLE "PasswordResetRequest"/);
  assert.doesNotMatch(
    migrationSql,
    /^(?:DROP|TRUNCATE|DELETE|UPDATE|ALTER TABLE "User")\b/m
  );
});

test('password reset persistence contains the accepted lifecycle and safe metadata only', () => {
  for (const column of [
    'userId',
    'tokenDigest',
    'exchangeDigest',
    'expiresAt',
    'dispatchedAt',
    'exchangedAt',
    'consumedAt',
    'revokedAt',
    'revocationReason',
    'providerName',
    'providerReceiptId',
    'correlationId',
    'createdAt',
    'updatedAt'
  ]) {
    assert.match(migrationSql, new RegExp(`"${column}"`));
  }

  assert.doesNotMatch(
    migrationSql,
    /"rawToken"|"token" TEXT|"email"|"password"|"ipAddress"|"headers"|"providerPayload"/i
  );
});

test('password reset migration supports digest lookup, lifecycle review, cleanup, and user association', () => {
  assert.match(
    migrationSql,
    /UNIQUE INDEX "PasswordResetRequest_tokenDigest_key"/
  );
  assert.match(
    migrationSql,
    /UNIQUE INDEX "PasswordResetRequest_exchangeDigest_key"/
  );
  assert.match(
    migrationSql,
    /INDEX "PasswordResetRequest_userId_status_createdAt_idx"/
  );
  assert.match(migrationSql, /INDEX "PasswordResetRequest_expiresAt_idx"/);
  assert.match(
    migrationSql,
    /INDEX "PasswordResetRequest_status_updatedAt_idx"/
  );
  assert.match(
    migrationSql,
    /FOREIGN KEY \("userId"\) REFERENCES "User"\("id"\) ON DELETE RESTRICT/
  );
});

test('Prisma schema exposes no raw password reset bearer field', () => {
  const model = schema.match(
    /model PasswordResetRequest \{[\s\S]*?\n\}/
  )?.[0];
  assert.ok(model);
  assert.match(model, /tokenDigest\s+String\s+@unique/);
  assert.doesNotMatch(model, /^\s*(?:token|rawToken)\s+/m);
});
