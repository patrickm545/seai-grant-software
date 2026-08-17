import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const command = readFileSync('scripts/verify-migration-lineage.ts', 'utf8');
const catalog = readFileSync('lib/postgres-catalog.ts', 'utf8');
const databaseCommand = readFileSync('scripts/run-database-command.ts', 'utf8');
const commandPolicy = readFileSync('lib/verifier-command-policy.ts', 'utf8');
const schemaFingerprint = readFileSync('lib/schema-fingerprint.ts', 'utf8');
const vercelBuild = readFileSync('scripts/run-vercel-build.ts', 'utf8');

test('lineage verifier uses repository-fixed attestation and manifest paths', () => {
  assert.match(command, /prisma',\s*'lineage-attestations',\s*'adr-0024-production\.json'/);
  assert.match(command, /prisma',\s*'migration-manifest\.json'/);
  assert.doesNotMatch(command, /process\.argv\[[^\]]+\].*(?:attestation|manifest).*Path/i);
  assert.match(command, /new Set<VerifierMode>/);
  assert.match(command, /verifyRepositoryEvidenceReferences/);
  assert.match(command, /existsSync/);
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
  assert.match(catalog, /unnest\(ix\.indkey\) WITH ORDINALITY/);
  assert.match(catalog, /key\.position <= ix\.indnkeyatts/);
  assert.match(catalog, /included\.position > ix\.indnkeyatts/);
  assert.match(catalog, /pg_get_expr\(ix\.indexprs/);
  assert.match(catalog, /pg_get_expr\(ix\.indpred/);
  assert.doesNotMatch(schemaFingerprint, /new RegExp/);
  assert.match(command, /production-evidence-capture/);
  assert.match(command, /captureProductionLineageEvidence/);
  assert.match(command, /assertRepeatedProductionLineageEvidence/);
});

test('Production evidence command cannot invoke deploy, resolve, DDL, DML, or caller SQL', () => {
  const start = command.indexOf("if (command === 'production-evidence-capture')");
  const end = command.indexOf("if (command === 'schema-fingerprint')", start);
  const captureBoundary = command.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(captureBoundary, /migrate\s+(?:deploy|resolve)/i);
  assert.doesNotMatch(
    captureBoundary,
    /\b(?:ALTER|CREATE|DELETE|DROP|GRANT|INSERT|MERGE|REVOKE|TRUNCATE|UPDATE)\b/i
  );
  assert.doesNotMatch(captureBoundary, /\$executeRaw|\$queryRaw|process\.argv\[[3-9]\]/);
  assert.equal((captureBoundary.match(/readDatabaseState\(\{/g) ?? []).length, 2);
  assert.match(captureBoundary, /first-migration-ledger/);
  assert.match(captureBoundary, /first-catalog/);
  assert.match(captureBoundary, /second-migration-ledger/);
  assert.match(captureBoundary, /second-catalog/);
});

test('guarded deploy cannot reach Prisma before verifier preflight or omit postflight', () => {
  const preflight = databaseCommand.indexOf("runVerifier('preflight')");
  const deploy = databaseCommand.indexOf('run(launchFixedPrismaCommand');
  const postflight = databaseCommand.indexOf("runVerifier('postflight')");
  assert.ok(preflight > 0 && deploy > preflight && postflight > deploy);
  assert.match(databaseCommand, /productionMigrationAcknowledgement/);
  assert.match(command, /PRODUCTION_RESTORE_POINT_CONFIRMED/);
  assert.match(command, /ADR0024_ATTESTATION_ID/);
});

test('Production pending status exits before Prisma or Vercel build can continue', () => {
  const decision = databaseCommand.indexOf("decision.kind === 'verified-pending-blocked'");
  const blockedExit = databaseCommand.indexOf('process.exit(decision.exitCode)', decision);
  const prisma = databaseCommand.indexOf('run(launchFixedPrismaCommand');
  assert.ok(decision > 0 && blockedExit > decision && prisma > blockedExit);
  assert.match(commandPolicy, /'production-status':\s*\[\s*VERIFIER_EXIT_CODES\.VERIFIED_CLEAN,\s*VERIFIER_EXIT_CODES\.VERIFIED_PENDING_BLOCKED/s);
  assert.match(commandPolicy, /'production-preflight': \[VERIFIER_EXIT_CODES\.VERIFIED_CLEAN\]/);
  assert.match(commandPolicy, /'production-postflight': \[VERIFIER_EXIT_CODES\.VERIFIED_CLEAN\]/);
  assert.match(databaseCommand, /deployment is intentionally blocked; no migration was applied/);
  const databasePreflight = vercelBuild.indexOf("'scripts/run-database-command.ts'");
  const applicationBuild = vercelBuild.indexOf("['build']");
  assert.ok(databasePreflight > 0 && applicationBuild > databasePreflight);
  assert.match(vercelBuild, /if \(status !== 0\) process\.exit\(status\)/);
});

test('verifier output has no URL, arbitrary SQL, or raw migration log output path', () => {
  assert.doesNotMatch(command, /console\.(?:log|error)\([^)]*DATABASE_URL/);
  assert.doesNotMatch(command, /console\.(?:log|error)\([^)]*ledgerRows/);
  assert.doesNotMatch(command, /console\.(?:log|error)\([^)]*catalog/);
  assert.match(command, /assertVerifierEvidenceSecretFree/);
  assert.doesNotMatch(command, /failedRecord\.logs/);
  assert.match(command, /safeProductionEvidenceStageDiagnostic/);
  assert.match(command, /Migration lineage verification failed safely/);
});
