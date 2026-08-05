import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  canonicaliseMigrationTimestamp,
  isCanonicalMigrationTimestamp
} from '../../lib/migration-timestamp';

test('migration timestamps preserve every significant fractional digit', () => {
  for (const value of [
    '2026-04-23T07:04:10.395Z',
    '2026-04-23T07:04:10.39554Z',
    '2026-04-23T07:04:10.527739Z',
    '2026-04-29T06:01:05.497406Z',
    '2026-04-29T06:01:38.423504Z',
    '2026-04-29T06:01:38.54346Z'
  ]) {
    assert.equal(canonicaliseMigrationTimestamp(value), value);
    assert.equal(isCanonicalMigrationTimestamp(value), true);
  }
});

test('insignificant trailing zero precision is normalized but is not canonical input', () => {
  assert.equal(
    canonicaliseMigrationTimestamp('2026-04-23T07:04:10.395540Z'),
    '2026-04-23T07:04:10.39554Z'
  );
  assert.equal(
    canonicaliseMigrationTimestamp('2026-04-23T07:04:10.395000Z'),
    '2026-04-23T07:04:10.395Z'
  );
  assert.equal(isCanonicalMigrationTimestamp('2026-04-23T07:04:10.395540Z'), false);
  assert.equal(isCanonicalMigrationTimestamp('2026-04-23T07:04:10.395000Z'), false);
});

test('migration timestamp normalization is string-only and platform-independent', () => {
  const source = readFileSync('lib/migration-timestamp.ts', 'utf8');
  assert.doesNotMatch(source, /\bDate(?:\.parse)?\b/);
  assert.equal(
    canonicaliseMigrationTimestamp('2026-04-23T07:04:10.527739Z'),
    '2026-04-23T07:04:10.527739Z'
  );
  const failedRecordTimestamps = [
    '2026-04-29T06:01:05.497406Z',
    '2026-04-29T06:01:38.423504Z'
  ];
  assert.equal(
    JSON.stringify(failedRecordTimestamps.map(canonicaliseMigrationTimestamp)),
    '["2026-04-29T06:01:05.497406Z","2026-04-29T06:01:38.423504Z"]'
  );
  const completedRecordTimestamps = [
    '2026-04-29T06:01:38.54346Z',
    '2026-04-29T06:01:38.54346Z'
  ];
  assert.equal(
    JSON.stringify(completedRecordTimestamps.map(canonicaliseMigrationTimestamp)),
    '["2026-04-29T06:01:38.54346Z","2026-04-29T06:01:38.54346Z"]'
  );
});
