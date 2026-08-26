import type { SafeDatabaseIdentity } from './database-safety';
import type { LineageAttestation } from './lineage-attestation';
import { AttestationValidationError, validateLineageAttestation } from './lineage-attestation';
import type { MigrationLedgerRow } from './migration-ledger';
import {
  MigrationRecordNormalizationError,
  normaliseMigrationRecord,
  verifyAttestedLedger
} from './migration-ledger';
import type { MigrationManifest } from './migration-manifest';
import type { CatalogSnapshot, SchemaProfile } from './schema-fingerprint';
import {
  assertNamedCatalog,
  fingerprintCatalog,
  SCHEMA_FINGERPRINT_VERSION
} from './schema-fingerprint';
import { assertPilotAuthHistoricalResolvedCatalog } from './historical-resolved-migration';

export const VERIFIER_VERSION = 'adr-0024-lineage-verifier/v2' as const;
export const VERIFIER_EXIT_CODES = {
  VERIFIED_CLEAN: 0,
  VERIFIED_PENDING_BLOCKED: 20,
  ATTESTATION_INACTIVE: 21,
  ATTESTATION_EXPIRED: 22,
  IDENTITY_MISMATCH: 23,
  INVENTORY_MISMATCH: 24,
  LEDGER_MISMATCH: 25,
  SCHEMA_MISMATCH: 26,
  UNSAFE_CONFIGURATION: 27,
  INTERNAL_ERROR: 70
} as const;

export type VerifierFailureCode = Exclude<keyof typeof VERIFIER_EXIT_CODES, 'VERIFIED_CLEAN'>;
export type VerifierMode =
  | 'strict-status'
  | 'strict-preflight'
  | 'strict-postflight'
  | 'production-status'
  | 'production-preflight'
  | 'production-postflight';

export class LineageVerifierError extends Error {
  constructor(
    public readonly code: VerifierFailureCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'LineageVerifierError';
  }
}

function fail(code: VerifierFailureCode, message: string): never {
  throw new LineageVerifierError(code, message);
}

export function verifyStrictLedger(rows: MigrationLedgerRow[], manifest: MigrationManifest) {
  const expected = new Map(manifest.migrations.map((migration) => [migration.name, migration]));
  const grouped = new Map<string, ReturnType<typeof normaliseMigrationRecord>[]>();
  for (const source of rows) {
    let row: ReturnType<typeof normaliseMigrationRecord>;
    try {
      row = normaliseMigrationRecord(source);
    } catch (error) {
      if (error instanceof MigrationRecordNormalizationError) {
        fail('LEDGER_MISMATCH', error.message);
      }
      throw error;
    }
    if (!expected.has(row.migrationName)) fail('LEDGER_MISMATCH', `Unexpected migration: ${row.migrationName}`);
    const records = grouped.get(row.migrationName) ?? [];
    records.push(row);
    grouped.set(row.migrationName, records);
  }
  const pending: string[] = [];
  for (const migration of manifest.migrations) {
    const records = grouped.get(migration.name) ?? [];
    if (!records.length) {
      pending.push(migration.name);
      continue;
    }
    if (records.length !== 1) fail('LEDGER_MISMATCH', `Ambiguous migration: ${migration.name}`);
    const row = records[0];
    if (
      row.checksum !== migration.checksum ||
      row.finishedAt === null ||
      row.rolledBackAt !== null ||
      row.appliedStepsCount !== 1 ||
      row.logsState !== 'none'
    ) {
      fail('LEDGER_MISMATCH', `Migration is not an exact successful application: ${migration.name}`);
    }
  }
  return { pending, appliedRepositoryCount: manifest.migrations.length - pending.length };
}

export function assertDeliberateProductionControls(input: {
  attestationId?: string;
  acknowledgement?: string;
  changeId?: string;
  restorePointConfirmation?: string;
}) {
  if (input.attestationId !== 'ADR-0024-PRODUCTION-2026-07-25') {
    fail('UNSAFE_CONFIGURATION', 'Exact ADR-0024 attestation identity is required.');
  }
  if (
    input.acknowledgement !== 'APPLY_APPROVED_PRODUCTION_MIGRATIONS' ||
    !input.changeId?.trim() ||
    /[*?]/.test(input.changeId)
  ) {
    fail('UNSAFE_CONFIGURATION', 'Exact acknowledgement and approved change ID are required.');
  }
  if (input.restorePointConfirmation !== 'CONFIRMED_CURRENT_RESTORE_POINT') {
    fail('UNSAFE_CONFIGURATION', 'Current restore-point confirmation is required.');
  }
  return { changeId: input.changeId.trim() };
}

export type VerifierEvidence = {
  evidenceVersion: 'adr-0024-verifier-evidence/v1';
  verifierVersion: typeof VERIFIER_VERSION;
  mode: VerifierMode;
  environment: string;
  databaseFingerprint: string;
  repositoryBaseline: string;
  manifestHash: string;
  migrationCount: number;
  appliedMigrationCount: number;
  pendingMigrations: string[];
  attestedDiscrepancy: 'not-applicable' | 'verified';
  attestedRepositoryChecksumDivergence: 'not-applicable' | 'verified';
  attestedRepositoryChecksumDivergences: Array<{
    migrationName: string;
    result: 'verified';
  }>;
  attestedHistoricalResolvedMigration: 'not-applicable' | 'verified';
  attestedHistoricalResolvedMigrations: Array<{
    migrationName: string;
    result: 'verified';
  }>;
  relatedDuplicateState: 'not-applicable' | 'verified';
  schemaFingerprintVersion: string;
  schemaFingerprint: string;
  schemaFingerprintResult: 'verified';
  namedCatalogAssertions: ReturnType<typeof assertNamedCatalog>;
  historicalResolvedCatalogAssertions:
    | ReturnType<typeof assertPilotAuthHistoricalResolvedCatalog>
    | null;
  lifecycleResult: 'not-applicable' | 'active';
  finalDecision: 'verified-clean' | 'verified-pending-blocked';
  timestamp: string;
  changeId: string | null;
};

export function verifyLineage(input: {
  mode: VerifierMode;
  environment: string;
  identity: SafeDatabaseIdentity;
  connectedDatabaseName: string;
  repositoryBaseline: string;
  manifest: MigrationManifest;
  attestation?: LineageAttestation;
  ledgerRows: MigrationLedgerRow[];
  catalog: CatalogSnapshot;
  now?: Date;
  changeId?: string;
}) {
  const productionMode = input.mode.startsWith('production-');
  if (input.connectedDatabaseName !== input.identity.databaseName) {
    fail('IDENTITY_MISMATCH', 'Connected database name differs from the guarded target identity.');
  }
  if (input.manifest.manifestHash.length !== 64) fail('INVENTORY_MISMATCH', 'Manifest hash is invalid.');

  let pending: string[];
  let appliedRepositoryCount: number;
  let attestedDiscrepancy: VerifierEvidence['attestedDiscrepancy'] = 'not-applicable';
  let attestedRepositoryChecksumDivergence: VerifierEvidence['attestedRepositoryChecksumDivergence'] =
    'not-applicable';
  let attestedRepositoryChecksumDivergences: VerifierEvidence['attestedRepositoryChecksumDivergences'] =
    [];
  let attestedHistoricalResolvedMigration: VerifierEvidence['attestedHistoricalResolvedMigration'] =
    'not-applicable';
  let attestedHistoricalResolvedMigrations: VerifierEvidence['attestedHistoricalResolvedMigrations'] =
    [];
  let relatedDuplicateState: VerifierEvidence['relatedDuplicateState'] = 'not-applicable';
  let lifecycleResult: VerifierEvidence['lifecycleResult'] = 'not-applicable';
  let profile: SchemaProfile = 'fresh-head';
  let expectedSchemaFingerprint: string | null = null;

  if (productionMode) {
    if (
      input.environment !== 'production' ||
      input.identity.fingerprint !== 'db_4e1d3bd23cff6801' ||
      !input.attestation
    ) {
      fail('IDENTITY_MISMATCH', 'ADR-0024 is restricted to the approved Production database.');
    }
    if (
      (input.mode === 'production-preflight' || input.mode === 'production-postflight') &&
      (!input.attestation.schema.postMigrationFingerprint ||
        !input.attestation.schema.postMigrationEvidence)
    ) {
      fail(
        'SCHEMA_MISMATCH',
        'Approved Production post-migration schema fingerprint evidence is unavailable.'
      );
    }
    try {
      validateLineageAttestation(input.attestation, { now: input.now, requireActive: true });
    } catch (error) {
      if (error instanceof AttestationValidationError) {
        if (error.code === 'ATTESTATION_INACTIVE') fail('ATTESTATION_INACTIVE', error.message);
        if (error.code === 'ATTESTATION_EXPIRED') fail('ATTESTATION_EXPIRED', error.message);
        fail('UNSAFE_CONFIGURATION', error.message);
      }
      throw error;
    }
    if (input.attestation.approvedManifestHash !== input.manifest.manifestHash) {
      fail('INVENTORY_MISMATCH', 'Attestation and repository manifest hashes differ.');
    }
    const approvedPending = ['20260724180000_password_reset_foundation'];
    try {
      const result = verifyAttestedLedger({
        rows: input.ledgerRows,
        manifest: input.manifest,
        attestation: input.attestation,
        mode: input.mode as 'production-status' | 'production-preflight' | 'production-postflight',
        approvedPendingMigrations: approvedPending,
        historicalResolvedMigrationMode: 'active-attestation'
      });
      pending = result.pending;
      appliedRepositoryCount = result.appliedRepositoryCount;
      attestedRepositoryChecksumDivergence = result.repositoryChecksumDivergence;
      attestedRepositoryChecksumDivergences = result.repositoryChecksumDivergences;
      attestedHistoricalResolvedMigration = 'verified';
      attestedHistoricalResolvedMigrations = result.historicalResolvedMigrations.map(
        ({ migrationName }) => ({ migrationName, result: 'verified' as const })
      );
    } catch (error) {
      fail('LEDGER_MISMATCH', error instanceof Error ? error.message : 'Ledger verification failed.');
    }
    profile = input.mode === 'production-postflight' ? 'post-password-reset' : 'pre-password-reset';
    expectedSchemaFingerprint =
      input.mode === 'production-postflight'
        ? input.attestation.schema.postMigrationFingerprint
        : input.attestation.schema.preMigrationFingerprint;
    attestedDiscrepancy = 'verified';
    relatedDuplicateState = 'verified';
    lifecycleResult = 'active';
  } else {
    if (input.environment === 'production') {
      fail('UNSAFE_CONFIGURATION', 'Production cannot use strict-status mode.');
    }
    const result = verifyStrictLedger(input.ledgerRows, input.manifest);
    pending = result.pending;
    appliedRepositoryCount = result.appliedRepositoryCount;
    profile = pending.includes('20260724180000_password_reset_foundation')
      ? 'pre-password-reset'
      : 'fresh-head';
  }

  let namedCatalogAssertions: ReturnType<typeof assertNamedCatalog>;
  let schemaFingerprint: string;
  let historicalResolvedCatalogAssertions: ReturnType<
    typeof assertPilotAuthHistoricalResolvedCatalog
  > | null = null;
  try {
    namedCatalogAssertions = assertNamedCatalog(input.catalog, profile);
    schemaFingerprint = fingerprintCatalog(input.catalog).fingerprint;
    if (productionMode) {
      historicalResolvedCatalogAssertions = assertPilotAuthHistoricalResolvedCatalog(
        input.catalog
      );
    }
  } catch (error) {
    fail('SCHEMA_MISMATCH', error instanceof Error ? error.message : 'Schema verification failed.');
  }
  if (expectedSchemaFingerprint && schemaFingerprint !== expectedSchemaFingerprint) {
    fail('SCHEMA_MISMATCH', 'Schema fingerprint differs from the approved attestation.');
  }
  if (productionMode && input.mode !== 'production-postflight') {
    const historical = input.attestation!.historicalResolvedMigrations[0];
    if (
      historical.observedCurrentSchema.fingerprint !== schemaFingerprint ||
      historical.observedCurrentSchema.catalogAssertionsDigest !==
        historicalResolvedCatalogAssertions?.assertionsDigest
    ) {
      fail(
        'SCHEMA_MISMATCH',
        'Historical resolved migration current schema evidence differs from the attestation.'
      );
    }
  }

  const pendingBlocked = input.mode.endsWith('status') && pending.length > 0;
  return {
    evidenceVersion: 'adr-0024-verifier-evidence/v1',
    verifierVersion: VERIFIER_VERSION,
    mode: input.mode,
    environment: input.environment,
    databaseFingerprint: input.identity.fingerprint,
    repositoryBaseline: input.repositoryBaseline,
    manifestHash: input.manifest.manifestHash,
    migrationCount: input.manifest.migrations.length,
    appliedMigrationCount: appliedRepositoryCount,
    pendingMigrations: pending,
    attestedDiscrepancy,
    attestedRepositoryChecksumDivergence,
    attestedRepositoryChecksumDivergences,
    attestedHistoricalResolvedMigration,
    attestedHistoricalResolvedMigrations,
    relatedDuplicateState,
    schemaFingerprintVersion: SCHEMA_FINGERPRINT_VERSION,
    schemaFingerprint,
    schemaFingerprintResult: 'verified',
    namedCatalogAssertions,
    historicalResolvedCatalogAssertions,
    lifecycleResult,
    finalDecision: pendingBlocked ? 'verified-pending-blocked' : 'verified-clean',
    timestamp: (input.now ?? new Date()).toISOString(),
    changeId: input.changeId?.trim() || null
  } satisfies VerifierEvidence;
}

const sensitiveKeyPattern =
  /(password|credential|secret|token|cookie|authorization|databaseurl|connection|string|api.?key|rawsql|customer)/i;
const urlPattern = /postgres(?:ql)?:\/\/|[?&](?:password|token|key)=/i;

export function assertVerifierEvidenceSecretFree(value: unknown, path = 'evidence') {
  if (typeof value === 'string' && urlPattern.test(value)) {
    throw new Error(`Secret-like value found at ${path}.`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertVerifierEvidenceSecretFree(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (sensitiveKeyPattern.test(key)) throw new Error(`Secret-like field found at ${path}.${key}.`);
      assertVerifierEvidenceSecretFree(child, `${path}.${key}`);
    }
  }
}

export function exitCodeFor(error: unknown) {
  return error instanceof LineageVerifierError
    ? VERIFIER_EXIT_CODES[error.code]
    : VERIFIER_EXIT_CODES.INTERNAL_ERROR;
}
