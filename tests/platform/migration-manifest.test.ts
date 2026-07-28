import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  calculateManifestHash,
  generateMigrationManifest
} from '../../lib/migration-manifest';

function repository(files: Array<{ name: string; content?: string; extra?: string }>) {
  const root = mkdtempSync(join(tmpdir(), 'clada-manifest-'));
  const migrations = join(root, 'prisma', 'migrations');
  mkdirSync(migrations, { recursive: true });
  for (const file of files) {
    const directory = join(migrations, file.name);
    mkdirSync(directory);
    if (file.content !== undefined) writeFileSync(join(directory, 'migration.sql'), file.content);
    if (file.extra) writeFileSync(join(directory, file.extra), 'unexpected');
  }
  return root;
}

test('migration manifest is ordered, POSIX-normalised, raw-byte hashed, and deterministic', () => {
  const root = repository([
    { name: '20260102030406_second', content: 'SELECT 2;\n' },
    { name: '20260102030405_first', content: 'SELECT 1;\n' }
  ]);
  const first = generateMigrationManifest(root, { byteSource: 'working-tree' });
  const second = generateMigrationManifest(root, { byteSource: 'working-tree' });
  assert.deepEqual(first, second);
  assert.deepEqual(first.migrations.map((entry) => entry.name), [
    '20260102030405_first',
    '20260102030406_second'
  ]);
  assert.equal(first.migrations[0].path, 'prisma/migrations/20260102030405_first/migration.sql');
  assert.doesNotMatch(first.migrations[0].path, /\\/);
  const { manifestHash, ...body } = first;
  assert.equal(manifestHash, calculateManifestHash(body));
});

test('migration manifest fails closed on CRLF, missing SQL, invalid names, and executables', () => {
  assert.throws(
    () =>
      generateMigrationManifest(
        repository([{ name: '20260102030405_crlf', content: 'SELECT 1;\r\n' }]),
        { byteSource: 'working-tree' }
      ),
    /LF raw bytes/
  );
  assert.throws(
    () =>
      generateMigrationManifest(repository([{ name: '20260102030405_missing' }]), {
        byteSource: 'working-tree'
      }),
    /Missing migration/
  );
  assert.throws(
    () =>
      generateMigrationManifest(repository([{ name: 'not-a-migration', content: 'SELECT 1;\n' }]), {
        byteSource: 'working-tree'
      }),
    /Invalid migration/
  );
  assert.throws(
    () =>
      generateMigrationManifest(
        repository([{ name: '20260102030405_exec', content: 'SELECT 1;\n', extra: 'run.ps1' }]),
        { byteSource: 'working-tree' }
      ),
    /Unexpected executable/
  );
});
