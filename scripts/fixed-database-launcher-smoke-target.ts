import {
  FIXED_DATABASE_LAUNCHER_SMOKE_ARGUMENT,
  FIXED_DATABASE_LAUNCHER_SMOKE_MARKER
} from '../lib/fixed-database-command-launcher';

if (
  process.argv.length !== 3 ||
  process.argv[2] !== FIXED_DATABASE_LAUNCHER_SMOKE_ARGUMENT
) {
  console.error('FIXED_DATABASE_LAUNCHER_SMOKE_FAILED: target argv differs.');
  process.exit(1);
}

process.stdout.write(`${FIXED_DATABASE_LAUNCHER_SMOKE_MARKER}\n`);
