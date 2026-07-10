import { spawnSync } from 'node:child_process';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  console.error('TEST_DATABASE_URL is required for PostgreSQL integration tests.');
  process.exit(1);
}

const parsedUrl = new URL(testDatabaseUrl);
if (!/^postgres(?:ql)?:$/.test(parsedUrl.protocol)) {
  console.error('TEST_DATABASE_URL must use postgres:// or postgresql://.');
  process.exit(1);
}

const databaseName = parsedUrl.pathname.replace(/^\//, '');
if (!/(^|[_-])(test|ci|tmp|temp)([_-]|$)/i.test(databaseName)) {
  console.error(`Refusing to run integration tests against non-test database "${databaseName}".`);
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl
};

function run(command, args) {
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('prisma', ['migrate', 'deploy']);
run('node', ['--import', 'tsx', '--test', 'tests/integration/**/*.test.ts']);
