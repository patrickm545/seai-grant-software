import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  BoundedProcessTimeoutError,
  runBoundedProcess
} from '../../lib/bounded-process';
import {
  evaluateMarkdownDebt,
  removeSafeDisposableRoot,
  runWithGuaranteedCleanup,
  type MarkdownViolation
} from '../../lib/preproduction-validation';

const repositoryRoot = resolve(__dirname, '..', '..');

function violation(file: string, line = 1): MarkdownViolation {
  return {
    file,
    line,
    column: 1,
    rule: 'MD036',
    alias: 'no-emphasis-as-heading',
    detail: 'Emphasis used instead of a heading',
    context: 'legacy'
  };
}

test('bounded process reports the exact timed-out stage and terminates its process tree', async () => {
  const root = mkdtempSync(join(tmpdir(), 'clada-adr0024-preproduction-'));
  const pidFile = join(root, 'child.pid');
  const source = [
    "const {spawn}=require('node:child_process');",
    "const {writeFileSync}=require('node:fs');",
    "const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});",
    `writeFileSync(${JSON.stringify(pidFile)},String(child.pid));`,
    'setInterval(()=>{},1000);'
  ].join('');
  await assert.rejects(
    runBoundedProcess({
      stage: 'synthetic-child-timeout',
      program: process.execPath,
      arguments: ['-e', source],
      timeoutMs: 500,
      cwd: repositoryRoot
    }),
    (error: unknown) =>
      error instanceof BoundedProcessTimeoutError &&
      error.stage === 'synthetic-child-timeout' &&
      error.timeoutMs === 500
  );
  const childPid = Number(readFileSync(pidFile, 'utf8'));
  await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  assert.throws(() => process.kill(childPid, 0));
  removeSafeDisposableRoot(root, tmpdir());
});

test('guaranteed cleanup runs after success and after failure', async () => {
  for (const shouldFail of [false, true]) {
    const calls: string[] = [];
    const operation = runWithGuaranteedCleanup({
      validate: async () => {
        calls.push('validate');
        if (shouldFail) throw new Error('synthetic failure');
        return 'ok';
      },
      stop: async () => { calls.push('stop'); },
      assertPortClosed: async () => { calls.push('port-closed'); },
      remove: async () => { calls.push('remove'); }
    });
    if (shouldFail) await assert.rejects(operation, /synthetic failure/);
    else assert.equal(await operation, 'ok');
    assert.deepEqual(calls, ['validate', 'stop', 'port-closed', 'remove']);
  }
});

test('safe disposable cleanup removes only the expected temp prefix', () => {
  const root = mkdtempSync(join(tmpdir(), 'clada-adr0024-preproduction-'));
  writeFileSync(join(root, 'evidence.txt'), 'synthetic');
  removeSafeDisposableRoot(root, tmpdir());
  assert.equal(existsSync(root), false);
  assert.throws(() => removeSafeDisposableRoot(repositoryRoot, tmpdir()), /cleanup target is invalid/);
});

test('Markdown debt distinguishes unchanged baseline debt from new and changed-file violations', () => {
  const legacy = violation('docs/legacy.md', 10);
  const unchanged = evaluateMarkdownDebt({
    baseline: [legacy],
    current: [legacy],
    changedMarkdownFiles: []
  });
  assert.equal(unchanged.preExistingCount, 1);
  assert.deepEqual(unchanged.newViolations, []);
  assert.deepEqual(unchanged.changedFileViolations, []);

  const changed = evaluateMarkdownDebt({
    baseline: [legacy],
    current: [legacy],
    changedMarkdownFiles: ['docs/legacy.md']
  });
  assert.equal(changed.changedFileViolations.length, 1);

  const introduced = violation('docs/new.md', 2);
  const newDebt = evaluateMarkdownDebt({
    baseline: [legacy],
    current: [legacy, introduced],
    changedMarkdownFiles: []
  });
  assert.deepEqual(newDebt.newViolations, [introduced]);
});

test('database gate retains every substantive password-reset and cleanup stage', () => {
  const source = readFileSync(
    join(repositoryRoot, 'scripts', 'run-password-reset-preproduction-database-gate.ts'),
    'utf8'
  );
  for (const required of [
    'database-startup',
    "stdio: 'ignore'",
    'canonical-pretarget-migrations',
    'strict-preflight',
    'guarded-password-reset-rehearsal',
    'run-database-command-from-env-file.ts',
    'quoted-synthetic-dotenv',
    "lineEndings: 'CRLF'",
    'strict-postflight',
    'integration-suite',
    'database-cleanup-stop',
    '20260724180000_password_reset_foundation',
    'cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7',
    'appliedMigrations: 16',
    'productionTuplesUsed: false',
    'attestedHistoricalResolvedMigrationUsed: false'
  ]) assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(source, /migrate resolve|db push|manual SQL/i);
});

test('integration runner is shell-free, serial, bounded and cannot silently skip files', () => {
  const source = readFileSync(join(repositoryRoot, 'scripts', 'run-postgres-integration-tests.ts'), 'utf8');
  assert.match(source, /runBoundedProcess/);
  assert.match(source, /testFileMs: 300_000/);
  assert.match(source, /suiteMs: 900_000/);
  assert.match(source, /\.sort\(\)/);
  assert.match(source, /for \(const \[index, file\] of integrationFiles\.entries\(\)\)/);
  assert.doesNotMatch(source, /shell:\s*true/);
});

test('full gate runs ESLint through the pinned shell-free package manager boundary', () => {
  const source = readFileSync(
    join(repositoryRoot, 'scripts', 'run-password-reset-preproduction-validation.ts'),
    'utf8'
  );
  assert.match(source, /resolvePinnedPackageManagerLauncher/);
  assert.match(source, /\.\.\.packageManager\.prefixArguments, 'exec', 'eslint', '\.'/);
  assert.match(source, /\.\.\.packageManager\.prefixArguments, 'exec', 'next', 'build'/);
  assert.match(source, /prohibitedOutput: \/\(\?:Failed to load plugin/);
  assert.match(source, /prohibited diagnostic emitted/);
  assert.match(source, /program: stage\.program \?\? node/);
  assert.doesNotMatch(source, /shell:\s*true/);
});
