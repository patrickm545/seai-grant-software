import { spawnSync } from 'node:child_process';
import { resolveVercelDatabasePreflight } from '../lib/vercel-build-safety';

function run(program: string, args: string[]) {
  const result = spawnSync(program, args, {
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });
  const status = result.status ?? 1;
  if (status !== 0) process.exit(status);
}

let preflight;
try {
  preflight = resolveVercelDatabasePreflight({
    VERCEL_ENV: process.env.VERCEL_ENV,
    APP_ENV: process.env.APP_ENV
  });
} catch (error) {
  console.error(
    `DB_OPERATION_NOT_ALLOWED: ${
      error instanceof Error ? error.message : 'Vercel build environment could not be verified.'
    }`
  );
  process.exit(1);
}

console.log(
  `Vercel database preflight selected: environment=${preflight.environment} command=${preflight.databaseCommand}`
);

run(process.execPath, [
  '--import',
  'tsx',
  'scripts/run-database-command.ts',
  preflight.databaseCommand
]);
run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['build']);
