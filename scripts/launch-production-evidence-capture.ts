import { launchFixedProductionEvidenceCapture } from '../lib/fixed-package-script-launcher';

if (process.argv.length !== 2) {
  console.error('FIXED_LAUNCHER_UNSAFE: this command accepts no arguments.');
  process.exit(1);
}

try {
  const result = launchFixedProductionEvidenceCapture();
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status === null) {
    console.error(
      `FIXED_LAUNCHER_FAILED: child terminated without an exit code; signal=${result.signal ?? 'unknown'}.`
    );
    process.exit(1);
  }
  process.exit(result.status);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'FIXED_LAUNCHER_FAILED: unknown launcher failure.'
  );
  process.exit(1);
}
