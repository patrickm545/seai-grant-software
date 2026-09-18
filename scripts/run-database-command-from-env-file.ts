import {
  DATABASE_CREDENTIAL_ENV_FILE_VARIABLE,
  DatabaseCredentialEnvError,
  formatDatabaseCredentialEnvError
} from '../lib/database-credential-env';
import {
  launchFixedGuardedDatabaseCommandFromEnvFile,
  type FixedGuardedDatabaseCommand
} from '../lib/fixed-database-command-launcher';

const command = process.argv[2] as FixedGuardedDatabaseCommand | undefined;
const credentialFile = process.env[DATABASE_CREDENTIAL_ENV_FILE_VARIABLE];

if (process.argv.length !== 3 || !command) {
  console.error('FIXED_DATABASE_LAUNCHER_UNSAFE: unexpected guarded database command.');
  process.exit(1);
}

if (process.env.DATABASE_URL?.trim()) {
  console.error('ENV_FILE_INVALID: DATABASE_URL must be absent at the credential-file boundary.');
  process.exit(1);
}

try {
  const result = launchFixedGuardedDatabaseCommandFromEnvFile(
    command,
    credentialFile ?? '',
    { cwd: process.cwd(), env: process.env }
  );
  process.exit(result.status ?? 1);
} catch (error) {
  if (error instanceof DatabaseCredentialEnvError) {
    console.error(formatDatabaseCredentialEnvError(error));
  } else {
    console.error(
      error instanceof Error && error.message.startsWith('FIXED_DATABASE_LAUNCHER_')
        ? error.message
        : formatDatabaseCredentialEnvError(error)
    );
  }
  process.exit(1);
}
