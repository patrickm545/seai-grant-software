import {
  FIXED_LAUNCHER_SMOKE_ARGUMENT,
  FIXED_LAUNCHER_SMOKE_MARKER
} from '../lib/fixed-package-script-launcher';

if (
  process.argv.length !== 3 ||
  process.argv[2] !== FIXED_LAUNCHER_SMOKE_ARGUMENT
) {
  console.error('FIXED_LAUNCHER_SMOKE_FAILED: target argv differs.');
  process.exit(1);
}

process.stdout.write(`${FIXED_LAUNCHER_SMOKE_MARKER}\n`);
