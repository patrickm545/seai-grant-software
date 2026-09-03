import { existsSync, realpathSync, rmSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

export const PREPRODUCTION_TIMEOUT_POLICY = {
  databaseInitializationMs: 60_000,
  databaseStartupMs: 30_000,
  databaseCreationMs: 30_000,
  canonicalMigrationMs: 180_000,
  verifierMs: 90_000,
  guardedRehearsalMs: 360_000,
  integrationSuiteMs: 900_000,
  cleanupMs: 30_000
} as const;

export type MarkdownViolation = {
  file: string;
  line: number;
  column: number | null;
  rule: string;
  alias: string;
  detail: string;
  context: string | null;
};

export type MarkdownDebtResult = {
  baselineCount: number;
  currentCount: number;
  preExistingCount: number;
  resolvedCount: number;
  changedFileViolations: MarkdownViolation[];
  newViolations: MarkdownViolation[];
};

export function markdownViolationKey(violation: MarkdownViolation) {
  return [
    violation.file.replaceAll('\\', '/'),
    violation.line,
    violation.column ?? '',
    violation.rule,
    violation.detail,
    violation.context ?? ''
  ].join('\0');
}

export function evaluateMarkdownDebt(input: {
  baseline: MarkdownViolation[];
  current: MarkdownViolation[];
  changedMarkdownFiles: string[];
}): MarkdownDebtResult {
  const baselineKeys = new Set(input.baseline.map(markdownViolationKey));
  const currentKeys = new Set(input.current.map(markdownViolationKey));
  const changed = new Set(input.changedMarkdownFiles.map((file) => file.replaceAll('\\', '/')));
  return {
    baselineCount: input.baseline.length,
    currentCount: input.current.length,
    preExistingCount: input.current.filter((violation) => baselineKeys.has(markdownViolationKey(violation))).length,
    resolvedCount: input.baseline.filter((violation) => !currentKeys.has(markdownViolationKey(violation))).length,
    changedFileViolations: input.current.filter((violation) => changed.has(violation.file.replaceAll('\\', '/'))),
    newViolations: input.current.filter((violation) => !baselineKeys.has(markdownViolationKey(violation)))
  };
}

export function assertSafeDisposableRoot(path: string, systemTempDirectory: string) {
  const resolvedPath = realpathSync(path);
  const resolvedTemp = realpathSync(systemTempDirectory);
  if (
    dirname(resolvedPath) !== resolvedTemp ||
    !basename(resolvedPath).startsWith('clada-adr0024-preproduction-')
  ) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: disposable cleanup target is invalid.');
  }
  return resolvedPath;
}

export function removeSafeDisposableRoot(path: string, systemTempDirectory: string) {
  if (!existsSync(path)) return;
  const safePath = assertSafeDisposableRoot(path, systemTempDirectory);
  rmSync(safePath, { recursive: true, force: false });
}

export async function runWithGuaranteedCleanup<T>(input: {
  validate: () => Promise<T>;
  stop: () => Promise<void>;
  assertPortClosed: () => Promise<void>;
  remove: () => Promise<void>;
}) {
  let primaryError: unknown;
  try {
    return await input.validate();
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      await input.stop();
      await input.assertPortClosed();
      await input.remove();
    } catch (cleanupError) {
      if (!primaryError) throw cleanupError;
      console.error(
        cleanupError instanceof Error
          ? `PREPRODUCTION_CLEANUP_FAILED: ${cleanupError.message}`
          : 'PREPRODUCTION_CLEANUP_FAILED: unknown cleanup failure.'
      );
    }
  }
}

export function resolveRepositoryPath(repositoryRoot: string, relativePath: string) {
  const candidate = resolve(repositoryRoot, relativePath);
  if (!candidate.startsWith(resolve(repositoryRoot))) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: repository path escaped its root.');
  }
  return candidate;
}
