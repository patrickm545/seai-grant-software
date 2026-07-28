import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const command = readFileSync('scripts/verify-migration-lineage.ts', 'utf8');
const catalog = readFileSync('lib/postgres-catalog.ts', 'utf8');
const databaseCommand = readFileSync('scripts/run-database-command.ts', 'utf8');

test('lineage verifier uses repository-fixed attestation and manifest paths', () => {
  assert.match(command, /prisma',\s*'lineage-attestations',\s*'adr-0024-production\.json'/);
  assert.match(command, /prisma',\s*'migration-manifest\.json'/);
  assert.doesNotMatch(command, /process\.argv\[[^\]]+\].*(?:attestation|manifest).*Path/i);
  assert.match(command, /new Set<VerifierMode>/);
});

test('gitless manifest verification is restricted to an identified Vercel checkout', () => {
  assert.match(command, /process\.env\.VERCEL === '1'/);
  assert.match(command, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(command, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(command, /isTrustedVercelCheckout \? 'working-tree' : 'git'/);
  assert.match(command, /'INVENTORY_MISMATCH'/);
});

test('database inspection runs in a read-only repeatable-read transaction with fixed SQL', () => {
  assert.match(command, /SET TRANSACTION READ ONLY/);
  assert.match(command, /isolationLevel:\s*'RepeatableRead'/);
  assert.doesNotMatch(catalog, /\$executeRaw/);
  assert.doesNotMatch(catalog, /\$\{[^}]+\}/);
  assert.match(catalog, /FROM public\._prisma_migrations/);
});

test('guarded deploy cannot reach Prisma before verifier preflight or omit postflight', () => {
  const preflight = databaseCommand.indexOf("runVerifier('preflight')");
  const deploy = databaseCommand.indexOf("if (definition.prismaArgs) run('prisma'");
  const postflight = databaseCommand.indexOf("runVerifier('postflight')");
  assert.ok(preflight > 0 && deploy > preflight && postflight > deploy);
  assert.match(databaseCommand, /productionMigrationAcknowledgement/);
  assert.match(command, /PRODUCTION_RESTORE_POINT_CONFIRMED/);
  assert.match(command, /ADR0024_ATTESTATION_ID/);
});

test('verifier output has no URL, arbitrary SQL, or raw migration log output path', () => {
  assert.doesNotMatch(command, /console\.(?:log|error)\([^)]*DATABASE_URL/);
  assert.doesNotMatch(command, /console\.(?:log|error)\([^)]*ledgerRows/);
  assert.doesNotMatch(command, /console\.(?:log|error)\([^)]*catalog/);
  assert.match(command, /assertVerifierEvidenceSecretFree/);
});
