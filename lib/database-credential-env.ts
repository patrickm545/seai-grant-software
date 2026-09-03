import { isUtf8 } from 'node:buffer';
import { lstatSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export const DATABASE_CREDENTIAL_ENV_FILE_VARIABLE =
  'DATABASE_CREDENTIAL_ENV_FILE' as const;

const MAX_CREDENTIAL_FILE_BYTES = 64 * 1024;
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export type DatabaseCredentialEnvErrorCode =
  | 'ENV_FILE_MISSING'
  | 'ENV_FILE_INVALID'
  | 'DB_URL_MISSING';

export class DatabaseCredentialEnvError extends Error {
  constructor(public readonly code: DatabaseCredentialEnvErrorCode) {
    super(code);
    this.name = 'DatabaseCredentialEnvError';
  }
}

function fail(code: DatabaseCredentialEnvErrorCode): never {
  throw new DatabaseCredentialEnvError(code);
}

function decodeCredentialFile(content: string | Buffer) {
  if (typeof content === 'string') {
    const source = content.startsWith('\uFEFF') ? content.slice(1) : content;
    if (Buffer.byteLength(source, 'utf8') > MAX_CREDENTIAL_FILE_BYTES) {
      fail('ENV_FILE_INVALID');
    }
    return source;
  }

  if (content.length > MAX_CREDENTIAL_FILE_BYTES) fail('ENV_FILE_INVALID');
  const bytes = content.subarray(
    content.subarray(0, UTF8_BOM.length).equals(UTF8_BOM) ? UTF8_BOM.length : 0
  );
  if (!isUtf8(bytes)) fail('ENV_FILE_INVALID');
  return bytes.toString('utf8');
}

function assertSingleDatabaseUrlDeclaration(source: string) {
  if (source.includes('\0')) fail('ENV_FILE_INVALID');
  const lfSource = source.replaceAll('\r\n', '\n');
  if (lfSource.includes('\r')) fail('ENV_FILE_INVALID');

  let declarationCount = 0;
  for (const line of lfSource.split('\n')) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const declaration = trimmed.match(
      /^(?:export[\t ]+)?DATABASE_URL[\t ]*=(.*)$/
    );
    if (!declaration) fail('ENV_FILE_INVALID');
    declarationCount += 1;

    const rawValue = declaration[1].trimStart();
    const quote = rawValue[0];
    if (quote === '"' || quote === "'" || quote === '`') {
      const closingQuote = rawValue.indexOf(quote, 1);
      if (closingQuote < 0) fail('ENV_FILE_INVALID');
      const suffix = rawValue.slice(closingQuote + 1).trimStart();
      if (suffix && !suffix.startsWith('#')) fail('ENV_FILE_INVALID');
    }
  }

  if (declarationCount === 0) fail('DB_URL_MISSING');
  if (declarationCount !== 1) fail('ENV_FILE_INVALID');
}

export function parseDatabaseCredentialEnv(content: string | Buffer) {
  const source = decodeCredentialFile(content);
  assertSingleDatabaseUrlDeclaration(source);

  let parsed: NodeJS.Dict<string>;
  try {
    parsed = parseEnv(source);
  } catch {
    fail('ENV_FILE_INVALID');
  }

  if (Object.keys(parsed).some((key) => key !== 'DATABASE_URL')) {
    fail('ENV_FILE_INVALID');
  }
  const databaseUrl = parsed.DATABASE_URL;
  if (!databaseUrl?.trim()) fail('DB_URL_MISSING');
  if (
    databaseUrl.includes('\0') ||
    databaseUrl.includes('\r') ||
    databaseUrl.includes('\n') ||
    /^["'`]|["'`]$/.test(databaseUrl)
  ) {
    fail('ENV_FILE_INVALID');
  }
  return { databaseUrl };
}

export function loadDatabaseCredentialEnvFile(filePath: string) {
  if (!filePath?.trim()) fail('ENV_FILE_MISSING');

  let size: number;
  try {
    const state = lstatSync(filePath);
    if (!state.isFile() || state.isSymbolicLink()) fail('ENV_FILE_INVALID');
    size = state.size;
  } catch (error) {
    if (error instanceof DatabaseCredentialEnvError) throw error;
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') fail('ENV_FILE_MISSING');
    fail('ENV_FILE_INVALID');
  }
  if (size < 1 || size > MAX_CREDENTIAL_FILE_BYTES) fail('ENV_FILE_INVALID');

  let content: Buffer;
  try {
    content = readFileSync(filePath);
  } catch {
    fail('ENV_FILE_INVALID');
  }
  if (content.length !== size) fail('ENV_FILE_INVALID');
  return parseDatabaseCredentialEnv(content);
}

export function environmentWithDatabaseCredential(
  baseEnvironment: NodeJS.ProcessEnv,
  filePath: string
) {
  const { databaseUrl } = loadDatabaseCredentialEnvFile(filePath);
  const environment: NodeJS.ProcessEnv = {
    ...baseEnvironment,
    DATABASE_URL: databaseUrl
  };
  delete environment[DATABASE_CREDENTIAL_ENV_FILE_VARIABLE];
  return environment;
}

export function formatDatabaseCredentialEnvError(error: unknown) {
  if (!(error instanceof DatabaseCredentialEnvError)) {
    return 'ENV_FILE_INVALID: Database credential file failed safely.';
  }
  const messages: Record<DatabaseCredentialEnvErrorCode, string> = {
    ENV_FILE_MISSING: 'Required database credential file is unavailable.',
    ENV_FILE_INVALID: 'Database credential file is invalid or unsafe.',
    DB_URL_MISSING: 'Database credential file does not contain a usable DATABASE_URL.'
  };
  return `${error.code}: ${messages[error.code]}`;
}
