import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { LineageAttestation } from '../../lib/lineage-attestation';
import { validateLineageAttestation } from '../../lib/lineage-attestation';
import {
  canonicaliseMigrationTimestamp,
  isCanonicalMigrationTimestamp
} from '../../lib/migration-timestamp';

const attestation = JSON.parse(
  readFileSync('prisma/lineage-attestations/adr-0024-production.json', 'utf8')
) as LineageAttestation;

const pinnedProductionTimestamps = [
  attestation.missingMigration.startedAt,
  attestation.missingMigration.finishedAt!,
  attestation.relatedMigration.failedRecord.startedAt,
  attestation.relatedMigration.failedRecord.rolledBackAt!,
  attestation.relatedMigration.completedZeroStepRecord.startedAt,
  attestation.relatedMigration.completedZeroStepRecord.finishedAt!
];

test('all six pinned Production ledger timestamps remain exact and canonical', () => {
  assert.deepEqual(pinnedProductionTimestamps, [
    '2026-04-23T07:04:10.39554Z',
    '2026-04-23T07:04:10.527739Z',
    '2026-04-29T06:01:05.497406Z',
    '2026-04-29T06:01:38.423504Z',
    '2026-04-29T06:01:38.54346Z',
    '2026-04-29T06:01:38.54346Z'
  ]);
  for (const value of pinnedProductionTimestamps) {
    assert.equal(isCanonicalMigrationTimestamp(value), true);
    assert.equal(canonicaliseMigrationTimestamp(value), value);
  }
});

test('pending lifecycle and unsupported future timestamps remain blank by design', () => {
  assert.equal(attestation.createdAt, '2026-07-28T00:00:00.000Z');
  assert.equal(attestation.reviewedAt, null);
  assert.equal(attestation.expiresAt, null);
  assert.equal(attestation.missingMigration.rolledBackAt, null);
  assert.equal(attestation.relatedMigration.failedRecord.finishedAt, null);
  assert.equal(attestation.relatedMigration.completedZeroStepRecord.rolledBackAt, null);
  assert.equal(attestation.pilotStageCompensatingControl?.activatedAt, null);
  assert.deepEqual(attestation.pilotStageCompensatingControl?.captures, []);
  assert.deepEqual(attestation.approvals, []);
  assert.equal(validateLineageAttestation(attestation).status, 'pending');
});

test('closed operation records intentionally preserve earlier truncated beliefs', () => {
  const records = [
    ['docs/03-engineering/PR_45_ADR_0024_PRODUCTION_EVIDENCE_R4.md', ['2026-04-23T07:04:10.395Z', '2026-04-23T07:04:10.527Z']],
    ['docs/03-engineering/PR_45_ADR_0024_PRODUCTION_EVIDENCE_R7.md', ['2026-04-29T06:01:05.497Z', '2026-04-29T06:01:38.423Z']],
    ['docs/03-engineering/PR_45_ADR_0024_PRODUCTION_EVIDENCE_R8.md', ['2026-04-29T06:01:38.543Z']]
  ] as const;
  for (const [path, historicalValues] of records) {
    const content = readFileSync(path, 'utf8');
    for (const value of historicalValues) assert.match(content, new RegExp(value.replaceAll('.', '\\.')));
  }
});

test('timestamp normalization stays string-only, platform-independent, and fail-closed', () => {
  const timestampSource = readFileSync('lib/migration-timestamp.ts', 'utf8');
  const ledgerSource = readFileSync('lib/migration-ledger.ts', 'utf8');
  assert.doesNotMatch(timestampSource, /\bDate(?:\.parse)?\b/);
  assert.match(ledgerSource, /canonicalJson\(actual\) !== canonicalJson\(expectedComparable\)/);
  assert.match(ledgerSource, /expectedPresent === observedPresent/);
  for (const invalid of [
    '2026-04-29T06:01:38.543460Z',
    '2026-04-29T06:01:38Z',
    '2026-04-29T06:01:38.54346+00:00',
    '2026-04-29t06:01:38.54346z'
  ]) {
    assert.equal(isCanonicalMigrationTimestamp(invalid), false);
  }
  assert.equal(
    JSON.stringify(pinnedProductionTimestamps.map(canonicaliseMigrationTimestamp)),
    '["2026-04-23T07:04:10.39554Z","2026-04-23T07:04:10.527739Z","2026-04-29T06:01:05.497406Z","2026-04-29T06:01:38.423504Z","2026-04-29T06:01:38.54346Z","2026-04-29T06:01:38.54346Z"]'
  );
});
