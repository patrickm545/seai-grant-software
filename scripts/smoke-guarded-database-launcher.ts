import {
  FIXED_DATABASE_LAUNCHER_SMOKE_MARKER,
  launchFixedDatabaseLauncherSmoke
} from '../lib/fixed-database-command-launcher';

if (process.argv.length !== 2) {
  console.error('FIXED_DATABASE_LAUNCHER_SMOKE_FAILED: this command accepts no arguments.');
  process.exit(1);
}

try {
  const result = launchFixedDatabaseLauncherSmoke();
  if (
    result.status !== 0 ||
    result.stdout.toString('utf8').trim() !== FIXED_DATABASE_LAUNCHER_SMOKE_MARKER
  ) {
    console.error('FIXED_DATABASE_LAUNCHER_SMOKE_FAILED: fixed argv was not received exactly.');
    process.exit(result.status ?? 1);
  }
  process.stdout.write('guarded launcher OK\n');
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'FIXED_DATABASE_LAUNCHER_SMOKE_FAILED: unknown launcher failure.'
  );
  process.exit(1);
}
