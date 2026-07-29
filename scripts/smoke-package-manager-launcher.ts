import { launchHarmlessPackageManagerVersionProbe } from '../lib/fixed-package-script-launcher';

try {
  const result = launchHarmlessPackageManagerVersionProbe();
  if (result.status !== 0 || result.stdout.trim() !== '10.11.0') {
    console.error('FIXED_LAUNCHER_SMOKE_FAILED: pinned package manager did not respond exactly.');
    process.exit(result.status ?? 1);
  }
  console.log(
    `Fixed package-manager launcher smoke passed: mechanism=${result.launcher.mechanism} version=${result.stdout.trim()}.`
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'FIXED_LAUNCHER_SMOKE_FAILED: unknown launcher failure.'
  );
  process.exit(1);
}
