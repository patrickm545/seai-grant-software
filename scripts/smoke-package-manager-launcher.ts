import {
  FIXED_LAUNCHER_SMOKE_MARKER,
  launchFixedLauncherSmoke
} from '../lib/fixed-package-script-launcher';

if (process.argv.length !== 2) {
  console.error('FIXED_LAUNCHER_SMOKE_FAILED: this command accepts no arguments.');
  process.exit(1);
}

try {
  const result = launchFixedLauncherSmoke();
  if (
    result.status !== 0 ||
    result.stdout.trim() !== FIXED_LAUNCHER_SMOKE_MARKER
  ) {
    console.error('FIXED_LAUNCHER_SMOKE_FAILED: fixed argv was not received exactly.');
    process.exit(result.status ?? 1);
  }
  process.stdout.write('launcher OK\n');
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'FIXED_LAUNCHER_SMOKE_FAILED: unknown launcher failure.'
  );
  process.exit(1);
}
