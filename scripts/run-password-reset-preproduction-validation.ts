import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBoundedProcess } from '../lib/bounded-process';
import { resolveFixedPrismaEntrypoint } from '../lib/fixed-database-command-launcher';
import {
  resolveFixedNodeExecutable,
  resolvePinnedPackageManagerLauncher
} from '../lib/fixed-package-script-launcher';

type ValidationStage = {
  name: string;
  program?: string;
  arguments: string[];
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  prohibitedOutput?: RegExp;
  expectedExitCodes?: number[];
};

const focusedTests = [
  'tests/platform/database-credential-env.test.ts',
  'tests/platform/preproduction-validation-gate.test.ts',
  'tests/platform/fixed-database-command-launcher.test.ts',
  'tests/platform/fixed-package-script-launcher.test.ts',
  'tests/platform/production-evidence-operation-retention.test.ts',
  'tests/platform/post-password-reset-catalog.test.ts',
  'tests/platform/post-migration-production-evidence.test.ts',
  'tests/platform/post-migration-production-evidence-security.test.ts',
  'tests/platform/lineage-verifier-security.test.ts',
  'tests/platform/lineage-attestation.test.ts',
  'tests/platform/password-reset-migration.test.ts',
  'tests/security/fixed-production-evidence-launcher-security.test.ts'
];

async function main() {
  if (process.env.DATABASE_URL?.trim()) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: DATABASE_URL must be absent before this gate starts.');
  }
  const repositoryRoot = process.cwd();
  const node = resolveFixedNodeExecutable();
  const packageManager = resolvePinnedPackageManagerLauncher();
  const prisma = resolveFixedPrismaEntrypoint({ repositoryRoot });
  const dummyEnvironment = {
    ...process.env,
    APP_ENV: 'test',
    DATABASE_ENVIRONMENT: 'test',
    DATABASE_URL: 'postgresql://postgres@127.0.0.1:1/build_validation',
    DATABASE_FINGERPRINT: 'db_9b6398047596e30c',
    PRODUCTION_DATABASE_FINGERPRINT: 'db_4e1d3bd23cff6801',
    DATABASE_BRANCH_ID: 'build-validation'
  };
  const cleanEnvironment = { ...process.env };
  delete cleanEnvironment.DATABASE_URL;
  const stages: ValidationStage[] = [
    {
      name: 'focused-tests',
      arguments: ['--import', 'tsx', '--test', ...focusedTests],
      timeoutMs: 240_000
    },
    {
      name: 'full-unit-platform-security',
      arguments: [join(repositoryRoot, 'scripts', 'run-unit-tests.mjs')],
      timeoutMs: 360_000
    },
    {
      name: 'eslint',
      program: packageManager.program,
      arguments: [...packageManager.prefixArguments, 'exec', 'eslint', '.'],
      timeoutMs: 240_000
    },
    {
      name: 'typescript',
      arguments: [join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit'],
      timeoutMs: 240_000
    },
    {
      name: 'prisma-validation',
      arguments: [prisma, 'validate'],
      timeoutMs: 90_000,
      env: dummyEnvironment
    },
    {
      name: 'production-build-no-deploy',
      program: packageManager.program,
      arguments: [...packageManager.prefixArguments, 'exec', 'next', 'build'],
      timeoutMs: 420_000,
      env: dummyEnvironment,
      prohibitedOutput: /(?:Failed to load plugin|ESLint couldn't find|[⨯×]\s+ESLint:)/i
    },
    {
      name: 'manifest-verification',
      arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'verify-migration-lineage.ts'), 'manifest-verify'],
      timeoutMs: 90_000
    },
    {
      name: 'immutable-history-verification',
      arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'verify-migration-lineage.ts'), 'history-verify-base'],
      timeoutMs: 90_000
    },
    {
      name: 'retired-attestation-validation',
      arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'verify-migration-lineage.ts'), 'attestation-verify'],
      timeoutMs: 90_000,
      expectedExitCodes: [21]
    },
    {
      name: 'markdown-baseline-validation',
      arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'validate-markdown-baseline.ts')],
      timeoutMs: 180_000
    },
    {
      name: 'repository-hygiene',
      arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'validate-repository-hygiene.ts')],
      timeoutMs: 180_000
    },
    {
      name: 'disposable-postgresql-gate',
      arguments: ['--import', 'tsx', join(repositoryRoot, 'scripts', 'run-password-reset-preproduction-database-gate.ts')],
      timeoutMs: 1_800_000,
      env: cleanEnvironment
    }
  ];
  const timings: Array<{ stage: string; durationMs: number; exitCode: number }> = [];
  for (const stage of stages) {
    const result = await runBoundedProcess({
      stage: stage.name,
      program: stage.program ?? node,
      arguments: stage.arguments,
      timeoutMs: stage.timeoutMs,
      cwd: repositoryRoot,
      env: stage.env ?? cleanEnvironment,
      mirrorOutput: true,
      expectedExitCodes: stage.expectedExitCodes
    });
    if (
      stage.prohibitedOutput?.test(
        Buffer.concat([result.stdout, Buffer.from('\n'), result.stderr]).toString('utf8')
      )
    ) {
      throw new Error(
        `PREPRODUCTION_VALIDATION_FAILED: stage=${stage.name}; prohibited diagnostic emitted.`
      );
    }
    timings.push({ stage: stage.name, durationMs: result.durationMs, exitCode: result.status! });
    console.log(
      `PREPRODUCTION_GATE_STAGE: stage=${stage.name}; durationMs=${result.durationMs}; exitCode=${result.status}`
    );
  }
  const report = {
    version: 'adr-0024-preproduction-validation/v1',
    result: 'passed',
    repositorySha: (
      await runBoundedProcess({
        stage: 'result-repository-revision',
        program: 'git',
        arguments: ['rev-parse', 'HEAD'],
        timeoutMs: 10_000,
        cwd: repositoryRoot
      })
    ).stdout.toString('utf8').trim(),
    timings,
    productionAccess: false
  };
  const outputDirectory = join(repositoryRoot, '.tools', 'preproduction-validation');
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, 'latest-full-gate.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`PREPRODUCTION_VALIDATION_RESULT=${JSON.stringify(report)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'PREPRODUCTION_VALIDATION_FAILED: unknown failure.');
  process.exitCode = 1;
});
