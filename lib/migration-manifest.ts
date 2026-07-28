import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { canonicalJson } from './canonical-json';

export const MIGRATION_MANIFEST_VERSION = 'clada-migration-manifest/v1' as const;
export const MIGRATION_NAME_PATTERN = /^\d{14}_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const forbiddenExecutablePattern = /\.(?:bat|cmd|com|exe|js|mjs|cjs|ps1|sh|ts|tsx)$/i;

export type MigrationManifestEntry = {
  position: number;
  name: string;
  path: string;
  filePresent: true;
  byteLength: number;
  checksum: string;
};

export type MigrationManifest = {
  version: typeof MIGRATION_MANIFEST_VERSION;
  checksumAlgorithm: 'sha256-raw-committed-git-blob-bytes';
  pathFormat: 'repository-relative-posix';
  bytePolicy: 'committed-git-blob-bytes-required-lf';
  migrations: MigrationManifestEntry[];
  manifestHash: string;
};

function sha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function posixPath(path: string) {
  return path.split(sep).join('/');
}

export function calculateManifestHash(
  manifest: Omit<MigrationManifest, 'manifestHash'>
): string {
  return sha256(canonicalJson(manifest));
}

export function generateMigrationManifest(
  repositoryRoot: string,
  options: { byteSource?: 'git' | 'working-tree'; requireLf?: boolean } = {}
): MigrationManifest {
  const migrationsRoot = join(repositoryRoot, 'prisma', 'migrations');
  const names = readdirSync(migrationsRoot)
    .filter((name) => statSync(join(migrationsRoot, name)).isDirectory())
    .sort();

  if (new Set(names).size !== names.length) throw new Error('Duplicate migration directory name.');

  const migrations = names.map((name, position): MigrationManifestEntry => {
    if (!MIGRATION_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid migration directory name: ${name}`);
    }
    const directory = join(migrationsRoot, name);
    const children = readdirSync(directory).sort();
    if (!children.includes('migration.sql')) {
      throw new Error(`Missing migration.sql: ${name}`);
    }
    const unexpectedExecutables = children.filter(
      (child) => child !== 'migration.sql' && forbiddenExecutablePattern.test(child)
    );
    if (unexpectedExecutables.length) {
      throw new Error(`Unexpected executable file in ${name}: ${unexpectedExecutables.join(', ')}`);
    }
    const migrationPath = join(directory, 'migration.sql');
    const repositoryPath = posixPath(relative(repositoryRoot, migrationPath));
    let bytes: Buffer;
    if ((options.byteSource ?? 'git') === 'git') {
      try {
        execFileSync('git', ['diff', '--quiet', '--', repositoryPath], {
          cwd: repositoryRoot,
          stdio: 'ignore'
        });
        bytes = execFileSync('git', ['show', `:${repositoryPath}`], {
          cwd: repositoryRoot,
          encoding: 'buffer',
          maxBuffer: 10 * 1024 * 1024
        });
      } catch {
        throw new Error(`Migration must be committed and unmodified before inventory: ${name}`);
      }
    } else {
      bytes = readFileSync(migrationPath);
    }
    if ((options.requireLf ?? true) && bytes.includes(13)) {
      throw new Error(`Migration must use LF raw bytes: ${name}`);
    }
    return {
      position,
      name,
      path: repositoryPath,
      filePresent: true,
      byteLength: bytes.length,
      checksum: sha256(bytes)
    };
  });

  const body = {
    version: MIGRATION_MANIFEST_VERSION,
    checksumAlgorithm: 'sha256-raw-committed-git-blob-bytes' as const,
    pathFormat: 'repository-relative-posix' as const,
    bytePolicy: 'committed-git-blob-bytes-required-lf' as const,
    migrations
  };
  return { ...body, manifestHash: calculateManifestHash(body) };
}

export function verifyMigrationManifest(repositoryRoot: string, approved: MigrationManifest) {
  const generated = generateMigrationManifest(repositoryRoot);
  if (canonicalJson(generated) !== canonicalJson(approved)) {
    throw new Error('Committed migration inventory differs from the approved manifest.');
  }
  return generated;
}

export function writeMigrationManifest(repositoryRoot: string, outputPath: string) {
  const manifest = generateMigrationManifest(repositoryRoot);
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8' });
  return manifest;
}

export function verifyImmutableMigrationHistory(repositoryRoot: string, baseRef = 'origin/main') {
  if (!/^(?!-)[a-zA-Z0-9_./-]+$/.test(baseRef)) throw new Error('Invalid migration-history base ref.');
  const names = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', baseRef, '--', 'prisma/migrations'],
    { cwd: repositoryRoot, encoding: 'utf8' }
  )
    .split(/\r?\n/)
    .filter((path) => /\/migration\.sql$/.test(path))
    .sort();
  for (const path of names) {
    let before: Buffer;
    let after: Buffer;
    try {
      before = execFileSync('git', ['show', `${baseRef}:${path}`], {
        cwd: repositoryRoot,
        encoding: 'buffer'
      });
      after = execFileSync('git', ['show', `:${path}`], {
        cwd: repositoryRoot,
        encoding: 'buffer'
      });
    } catch {
      throw new Error(`Applied migration was deleted or renamed: ${path}`);
    }
    if (!before.equals(after)) throw new Error(`Historical migration was modified: ${path}`);
  }
  return { baseRef, verifiedHistoricalMigrations: names.length };
}
