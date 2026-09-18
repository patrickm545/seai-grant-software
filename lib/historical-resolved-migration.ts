import { createHash } from 'node:crypto';
import expectedSchemaInventoryJson from '../docs/03-engineering/evidence/ADR_0024_PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.json';
import { canonicalJson } from './canonical-json';
import type { CatalogSnapshot } from './schema-fingerprint';

export const HISTORICAL_RESOLVED_MIGRATION_STATE_NAME =
  'attestedHistoricalResolvedMigration' as const;
export const HISTORICAL_RESOLVED_MIGRATION_STATE_VERSION =
  'adr-0024-attested-historical-resolved-migration/v1' as const;
export const HISTORICAL_RESOLVED_CATALOG_ASSERTIONS_VERSION =
  'adr-0024-historical-resolved-catalog-assertions/v1' as const;
export const PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY_REFERENCE =
  'docs/03-engineering/evidence/ADR_0024_PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.json' as const;
export const PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY_SHA256 =
  '59776802420939275534b139cf9c05c911e9177690e6689964f1ca07962317e5' as const;

type ExpectedColumn = Pick<
  CatalogSnapshot['columns'][number],
  | 'schema'
  | 'table'
  | 'name'
  | 'dataType'
  | 'databaseType'
  | 'nullable'
  | 'defaultExpression'
  | 'identity'
  | 'generated'
>;
type ExpectedConstraint = Pick<
  CatalogSnapshot['constraints'][number],
  | 'schema'
  | 'table'
  | 'name'
  | 'type'
  | 'columns'
  | 'referencedSchema'
  | 'referencedTable'
> & { definitionRequirements: string[] };
type ExpectedIndex = Pick<
  CatalogSnapshot['indexes'][number],
  | 'schema'
  | 'table'
  | 'name'
  | 'unique'
  | 'primary'
  | 'keyColumns'
  | 'includedColumns'
  | 'hasExpressions'
  | 'partial'
  | 'constraintBacked'
>;
type ExpectedInventorySection = {
  sourceMigration: string;
  tables: CatalogSnapshot['tables'];
  columns: ExpectedColumn[];
  constraints: ExpectedConstraint[];
  indexes: ExpectedIndex[];
  enums: CatalogSnapshot['enums'];
};
export type PilotAuthExpectedSchemaInventory = {
  version: 'adr-0024-pilot-auth-evolved-schema-inventory/v1';
  stateName: typeof HISTORICAL_RESOLVED_MIGRATION_STATE_NAME;
  migrationName: '20260716183000_pilot_installer_auth';
  scope: string;
  directlyIntroduced: ExpectedInventorySection;
  compatibleEvolution: ExpectedInventorySection;
  comparisonPolicy: {
    requireEveryNamedObjectExactlyOnce: true;
    requireExactStructuralFields: true;
    requireConstraintDefinitionTerms: true;
    allowOnlyDeclaredCompatibleEvolution: true;
    requireFullCurrentCatalogFingerprintForActivation: true;
    rejectUnsupportedOrConflictingNamedObjects: true;
  };
};

export const PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY =
  expectedSchemaInventoryJson as PilotAuthExpectedSchemaInventory;

export const PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS = {
  stateName: HISTORICAL_RESOLVED_MIGRATION_STATE_NAME,
  stateVersion: HISTORICAL_RESOLVED_MIGRATION_STATE_VERSION,
  environment: 'production',
  productionDatabaseFingerprint: 'db_4e1d3bd23cff6801',
  migrationName: '20260716183000_pilot_installer_auth',
  recordId: '69505647-7711-408c-853e-32579345d1b0',
  repositoryChecksum: 'd35cb01bfaeea27b02a4a1361a4f05688e730592e3cd1731ed23911871ca81fb',
  observedProductionChecksum:
    'fee0749e78b3ecc7aea1f6823b338a16c0ed5fb8e4613e079042bb52192913a9',
  checksumClassification: 'A-exact-alternate-byte-representation-proven',
  checksumEvidenceReference:
    'docs/03-engineering/evidence/ADR_0024_R13_CHECKSUM_DIVERGENCE.json',
  checksumEvidenceSha256:
    '9134ad417c1fba9ff440af03c1e0853b83eca69aa0b0696f67b538d728532ed8',
  lifecycleClassification:
    'L1-zero-step-completed-state-authoritatively-explained-and-safe-historical-operation',
  resolveEvidenceReference:
    'local-codex-session/2026-07-17/rollout-2026-07-17T12-49-52-019f6fe9-4a16-7812-b729-cad26dcbaddd.jsonl',
  resolveEvidenceSha256:
    '779cdd18bfca9a6a60c0dd764551c2f56b693913b5275b544a5d15e3a13422de',
  lifecycleEvidenceReference:
    'docs/03-engineering/evidence/ADR_0024_R13_ZERO_STEP_LIFECYCLE_INVESTIGATION.json',
  lifecycleEvidenceSha256:
    '5f1f11c00fca0df3a0d97cbc1b93b0e333dd65cf2e1ba217c04d334a1352ee4a',
  expectedSchemaInventoryReference: PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY_REFERENCE,
  expectedSchemaInventorySha256: PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY_SHA256,
  expectedSchemaInventoryVersion: PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.version,
  expectedAppliedStepsCount: 0,
  expectedRolledBackAt: null,
  expectedLogsState: 'none',
  expectedLogsDigest: null,
  approvedManifestHash:
    '1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872',
  approvedRepositoryLineageBaseline: 'a238c6c6c9569761a14257a5deafa034d3ea1029',
  scope: 'Exact ADR-0024 Production pilot authentication historical resolve record only',
  retirementCondition: 'Retires with ADR-0024 attestation'
} as const;

type AssertionResult = {
  assertion: string;
  sourceMigration: string;
  passed: true;
};

function exactOne<T>(values: T[], label: string) {
  if (values.length !== 1) {
    throw new Error(`Historical resolved catalog assertion failed: ${label} must exist exactly once.`);
  }
  return values[0];
}

function assertExactFields<T extends object>(
  actual: T,
  expected: Partial<T>,
  label: string
) {
  for (const [key, value] of Object.entries(expected)) {
    if (canonicalJson(actual[key as keyof T]) !== canonicalJson(value)) {
      throw new Error(
        `Historical resolved catalog assertion failed: ${label}.${key} differs.`
      );
    }
  }
}

function assertSection(
  snapshot: CatalogSnapshot,
  section: ExpectedInventorySection,
  results: AssertionResult[]
) {
  for (const expected of section.tables) {
    const actual = exactOne(
      snapshot.tables.filter(
        (item) => item.schema === expected.schema && item.name === expected.name
      ),
      `table ${expected.schema}.${expected.name}`
    );
    assertExactFields(actual, expected, `table ${expected.schema}.${expected.name}`);
    results.push({
      assertion: `table:${expected.schema}.${expected.name}:exact`,
      sourceMigration: section.sourceMigration,
      passed: true
    });
  }

  for (const expected of section.columns) {
    const actual = exactOne(
      snapshot.columns.filter(
        (item) =>
          item.schema === expected.schema &&
          item.table === expected.table &&
          item.name === expected.name
      ),
      `column ${expected.schema}.${expected.table}.${expected.name}`
    );
    assertExactFields(actual, expected, `column ${expected.schema}.${expected.table}.${expected.name}`);
    results.push({
      assertion: `column:${expected.schema}.${expected.table}.${expected.name}:exact`,
      sourceMigration: section.sourceMigration,
      passed: true
    });
  }

  for (const expected of section.constraints) {
    const actual = exactOne(
      snapshot.constraints.filter(
        (item) =>
          item.schema === expected.schema &&
          item.table === expected.table &&
          item.name === expected.name
      ),
      `constraint ${expected.schema}.${expected.table}.${expected.name}`
    );
    const { definitionRequirements, ...structural } = expected;
    assertExactFields(
      actual,
      structural,
      `constraint ${expected.schema}.${expected.table}.${expected.name}`
    );
    const definition = actual.definition.toLocaleUpperCase();
    if (
      definitionRequirements.some(
        (requirement) => !definition.includes(requirement.toLocaleUpperCase())
      )
    ) {
      throw new Error(
        `Historical resolved catalog assertion failed: constraint ${expected.name} definition differs.`
      );
    }
    results.push({
      assertion: `constraint:${expected.schema}.${expected.table}.${expected.name}:exact`,
      sourceMigration: section.sourceMigration,
      passed: true
    });
  }

  for (const expected of section.indexes) {
    const actual = exactOne(
      snapshot.indexes.filter(
        (item) =>
          item.schema === expected.schema &&
          item.table === expected.table &&
          item.name === expected.name
      ),
      `index ${expected.schema}.${expected.table}.${expected.name}`
    );
    assertExactFields(actual, expected, `index ${expected.schema}.${expected.table}.${expected.name}`);
    results.push({
      assertion: `index:${expected.schema}.${expected.table}.${expected.name}:exact`,
      sourceMigration: section.sourceMigration,
      passed: true
    });
  }

  for (const expected of section.enums) {
    const actual = exactOne(
      snapshot.enums.filter(
        (item) => item.schema === expected.schema && item.name === expected.name
      ),
      `enum ${expected.schema}.${expected.name}`
    );
    assertExactFields(actual, expected, `enum ${expected.schema}.${expected.name}`);
    results.push({
      assertion: `enum:${expected.schema}.${expected.name}:exact`,
      sourceMigration: section.sourceMigration,
      passed: true
    });
  }
}

export function assertPilotAuthHistoricalResolvedCatalog(snapshot: CatalogSnapshot) {
  const results: AssertionResult[] = [];
  assertSection(snapshot, PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.directlyIntroduced, results);
  assertSection(snapshot, PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.compatibleEvolution, results);

  const protectedNames = new Set([
    ...PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.directlyIntroduced.tables.map((item) => item.name),
    ...PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.directlyIntroduced.constraints.map(
      (item) => item.name
    ),
    ...PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.directlyIntroduced.indexes.map((item) => item.name),
    ...PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.compatibleEvolution.constraints.map(
      (item) => item.name
    ),
    ...PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.compatibleEvolution.indexes.map(
      (item) => item.name
    ),
    ...PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.compatibleEvolution.enums.map((item) => item.name)
  ]);
  const conflicts = snapshot.unsupportedObjects.filter(
    (item) => item.schema === 'public' && protectedNames.has(item.name)
  );
  if (conflicts.length) {
    throw new Error('Historical resolved catalog assertion failed: a protected name is unsupported.');
  }

  const evidence = {
    version: HISTORICAL_RESOLVED_CATALOG_ASSERTIONS_VERSION,
    stateName: HISTORICAL_RESOLVED_MIGRATION_STATE_NAME,
    migrationName: PILOT_AUTH_HISTORICAL_RESOLVED_KNOWN_FIELDS.migrationName,
    expectedSchemaInventoryVersion: PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.version,
    expectedSchemaInventorySha256: PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY_SHA256,
    results
  };
  return {
    ...evidence,
    assertionsDigest: createHash('sha256').update(canonicalJson(evidence)).digest('hex')
  };
}
