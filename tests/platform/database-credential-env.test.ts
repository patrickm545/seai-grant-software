import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DatabaseCredentialEnvError,
  environmentWithDatabaseCredential,
  formatDatabaseCredentialEnvError,
  loadDatabaseCredentialEnvFile,
  parseDatabaseCredentialEnv
} from '../../lib/database-credential-env';
import {
  formatDatabaseSafetyError,
  getDatabaseIdentity
} from '../../lib/database-safety';
import { removeSafeDisposableRoot } from '../../lib/preproduction-validation';

const syntheticUrl =
  'postgresql://synthetic_user@127.0.0.1:5432/example?value=a%3Db&mode=require';

function expectCredentialError(
  source: string | Buffer,
  code: 'ENV_FILE_INVALID' | 'DB_URL_MISSING'
) {
  assert.throws(
    () => parseDatabaseCredentialEnv(source),
    (error: unknown) => error instanceof DatabaseCredentialEnvError && error.code === code
  );
}

test('mechanical R3 reproduction retains quotes with the former manual slice', () => {
  const line = `DATABASE_URL="${syntheticUrl}"`;
  const oldBoundaryValue = line.slice('DATABASE_URL='.length);
  assert.equal(oldBoundaryValue, `"${syntheticUrl}"`);
  assert.throws(() => getDatabaseIdentity(oldBoundaryValue), /Database URL could not be parsed safely/);
  assert.equal(parseDatabaseCredentialEnv(line).databaseUrl, syntheticUrl);
});

test('double-quoted, single-quoted, and unquoted values decode identically', () => {
  for (const source of [
    `DATABASE_URL="${syntheticUrl}"`,
    `DATABASE_URL='${syntheticUrl}'`,
    `DATABASE_URL=${syntheticUrl}`
  ]) {
    assert.equal(parseDatabaseCredentialEnv(source).databaseUrl, syntheticUrl);
  }
});

test('LF and CRLF files decode identically', () => {
  for (const newline of ['\n', '\r\n']) {
    const source = `# synthetic${newline}DATABASE_URL="${syntheticUrl}"${newline}`;
    assert.equal(parseDatabaseCredentialEnv(source).databaseUrl, syntheticUrl);
  }
});

test('query equals signs, percent encoding, and URL special characters are retained', () => {
  const value =
    'postgresql://synthetic%2Buser@127.0.0.1:5432/example?options=-c%20x%3Da&value=one=two';
  assert.equal(
    parseDatabaseCredentialEnv(`DATABASE_URL="${value}"`).databaseUrl,
    value
  );
});

test('dotenv whitespace, comments, export, and optional UTF-8 BOM are deterministic', () => {
  const source = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(
      `  # ignored comment\r\n  export DATABASE_URL = "${syntheticUrl}" # trailing comment\r\n`,
      'utf8'
    )
  ]);
  assert.equal(parseDatabaseCredentialEnv(source).databaseUrl, syntheticUrl);
});

test('quoted hash remains data while an unquoted hash begins a dotenv comment', () => {
  const quoted = `${syntheticUrl}#fragment`;
  assert.equal(
    parseDatabaseCredentialEnv(`DATABASE_URL="${quoted}"`).databaseUrl,
    quoted
  );
  assert.equal(
    parseDatabaseCredentialEnv(`DATABASE_URL=${syntheticUrl} # ignored`).databaseUrl,
    syntheticUrl
  );
});

test('missing and empty DATABASE_URL declarations fail closed', () => {
  expectCredentialError('# comments only\n', 'DB_URL_MISSING');
  expectCredentialError('DATABASE_URL=\n', 'DB_URL_MISSING');
  expectCredentialError('DATABASE_URL=""\n', 'DB_URL_MISSING');
});

test('malformed quotes, duplicate declarations, extra variables, and bare CR fail closed', () => {
  for (const source of [
    `DATABASE_URL="${syntheticUrl}`,
    `DATABASE_URL="${syntheticUrl}" trailing`,
    `DATABASE_URL=${syntheticUrl}\nDATABASE_URL=${syntheticUrl}`,
    `DATABASE_URL=${syntheticUrl}\nOTHER=value`,
    `DATABASE_URL=${syntheticUrl}\rOTHER=value`
  ]) {
    expectCredentialError(source, 'ENV_FILE_INVALID');
  }
});

test('NUL, invalid UTF-8, and oversized credential files fail closed', () => {
  expectCredentialError(`DATABASE_URL=${syntheticUrl}\0`, 'ENV_FILE_INVALID');
  expectCredentialError(
    Buffer.concat([Buffer.from('DATABASE_URL='), Buffer.from([0xc3, 0x28])]),
    'ENV_FILE_INVALID'
  );
  expectCredentialError(
    `DATABASE_URL=${'x'.repeat(64 * 1024)}`,
    'ENV_FILE_INVALID'
  );
});

test('file loader accepts only a present regular credential file', () => {
  const root = mkdtempSync(join(tmpdir(), 'clada-adr0024-preproduction-'));
  try {
    const file = join(root, 'credential.env');
    writeFileSync(file, `DATABASE_URL="${syntheticUrl}"\r\n`, 'utf8');
    assert.equal(loadDatabaseCredentialEnvFile(file).databaseUrl, syntheticUrl);
    assert.throws(
      () => loadDatabaseCredentialEnvFile(join(root, 'missing.env')),
      (error: unknown) =>
        error instanceof DatabaseCredentialEnvError && error.code === 'ENV_FILE_MISSING'
    );
    const directory = join(root, 'directory.env');
    mkdirSync(directory);
    assert.throws(
      () => loadDatabaseCredentialEnvFile(directory),
      (error: unknown) =>
        error instanceof DatabaseCredentialEnvError && error.code === 'ENV_FILE_INVALID'
    );

    const link = join(root, 'linked.env');
    try {
      symlinkSync(file, link, 'file');
      assert.throws(
        () => loadDatabaseCredentialEnvFile(link),
        (error: unknown) =>
          error instanceof DatabaseCredentialEnvError && error.code === 'ENV_FILE_INVALID'
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
    }
  } finally {
    removeSafeDisposableRoot(root, tmpdir());
  }
});

test('credential environment is copied, unquoted, and does not retain its source path', () => {
  const root = mkdtempSync(join(tmpdir(), 'clada-adr0024-preproduction-'));
  try {
    const file = join(root, 'credential.env');
    writeFileSync(file, `DATABASE_URL="${syntheticUrl}"\n`, 'utf8');
    const base: NodeJS.ProcessEnv = {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      DATABASE_CREDENTIAL_ENV_FILE: file
    };
    const environment = environmentWithDatabaseCredential(base, file);
    assert.equal(environment.DATABASE_URL, syntheticUrl);
    assert.equal(environment.DATABASE_CREDENTIAL_ENV_FILE, undefined);
    assert.equal(base.DATABASE_URL, undefined);
  } finally {
    removeSafeDisposableRoot(root, tmpdir());
  }
});

test('invalid parsed URLs still fail in the existing guarded URL validator', () => {
  const parsed = parseDatabaseCredentialEnv('DATABASE_URL="not-a-postgresql-url"');
  let diagnostic = '';
  try {
    getDatabaseIdentity(parsed.databaseUrl, { operation: 'migration-status' });
  } catch (error) {
    diagnostic = formatDatabaseSafetyError(error);
  }
  assert.match(diagnostic, /^DB_URL_INVALID:/);
});

test('credential diagnostics never expose source content or parser exceptions', () => {
  const secret = 'credential-do-not-print secret-host private-query-value';
  for (const error of [
    new DatabaseCredentialEnvError('ENV_FILE_INVALID'),
    new DatabaseCredentialEnvError('DB_URL_MISSING'),
    new Error(secret)
  ]) {
    const diagnostic = formatDatabaseCredentialEnvError(error);
    assert.doesNotMatch(diagnostic, /do-not-print|secret-host|private-query-value/);
  }
});
