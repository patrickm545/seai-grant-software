import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { lint } from 'markdownlint-cli2/markdownlint/promise';
import {
  evaluateMarkdownDebt,
  type MarkdownViolation
} from '../lib/preproduction-validation';

const BASELINE_PATH = '.markdownlint-baseline.json';
const APPROVED_BASELINE = 'd8a8dc1b8fbd6beebb89344f458366fc43b4a7ba';

type MarkdownlintError = {
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  errorDetail: string | null;
  errorContext: string | null;
  errorRange: number[] | null;
};

function markdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

function normaliseResults(
  repositoryRoot: string,
  results: Record<string, MarkdownlintError[]>
): MarkdownViolation[] {
  return Object.entries(results).flatMap(([file, errors]) =>
    errors.map((error) => ({
      file: relative(repositoryRoot, resolve(repositoryRoot, file)).replaceAll('\\', '/'),
      line: error.lineNumber,
      column: error.errorRange?.[0] ?? null,
      rule: error.ruleNames[0] ?? 'unknown',
      alias: error.ruleNames[1] ?? error.ruleNames[0] ?? 'unknown',
      detail: error.errorDetail ?? error.ruleDescription,
      context: error.errorContext
    }))
  ).sort((left, right) =>
    left.file.localeCompare(right.file) || left.line - right.line || left.rule.localeCompare(right.rule)
  );
}

function gitLines(repositoryRoot: string, arguments_: string[]) {
  const output = execFileSync('git', arguments_, { cwd: repositoryRoot, encoding: 'utf8' });
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function main() {
  const repositoryRoot = process.cwd();
  const files = markdownFiles(join(repositoryRoot, 'docs'));
  const lintResult = await lint({ files, config: { MD013: false } });
  const current = normaliseResults(repositoryRoot, lintResult as Record<string, MarkdownlintError[]>);
  if (process.argv[2] === '--write-approved-baseline') {
    const head = gitLines(repositoryRoot, ['rev-parse', 'HEAD'])[0];
    const changedMarkdown = [
      ...gitLines(repositoryRoot, ['diff', '--name-only', APPROVED_BASELINE, '--', '*.md']),
      ...gitLines(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '--', '*.md'])
    ];
    if (head !== APPROVED_BASELINE || changedMarkdown.length) {
      throw new Error('MARKDOWN_BASELINE_INVALID: generation requires the exact approved Markdown baseline.');
    }
    writeFileSync(
      join(repositoryRoot, BASELINE_PATH),
      `${JSON.stringify({
        version: 'clada-markdownlint-baseline/v1',
        tool: 'markdownlint-cli2@0.20.0/markdownlint@0.40.0',
        approvedBaseline: APPROVED_BASELINE,
        rules: { MD013: false },
        violationCount: current.length,
        violations: current
      }, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' }
    );
    console.log(`MARKDOWN_BASELINE_WRITTEN: violations=${current.length}`);
    return;
  }
  if (!existsSync(join(repositoryRoot, BASELINE_PATH))) {
    throw new Error('MARKDOWN_BASELINE_INVALID: baseline file is missing.');
  }
  const baselineDocument = JSON.parse(readFileSync(join(repositoryRoot, BASELINE_PATH), 'utf8')) as {
    version: string;
    approvedBaseline: string;
    violations: MarkdownViolation[];
  };
  if (
    baselineDocument.version !== 'clada-markdownlint-baseline/v1' ||
    baselineDocument.approvedBaseline !== APPROVED_BASELINE ||
    !Array.isArray(baselineDocument.violations)
  ) {
    throw new Error('MARKDOWN_BASELINE_INVALID: baseline identity is invalid.');
  }
  const changed = new Set([
    ...gitLines(repositoryRoot, ['diff', '--name-only', APPROVED_BASELINE, '--', '*.md']),
    ...gitLines(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '--', '*.md'])
  ]);
  const result = evaluateMarkdownDebt({
    baseline: baselineDocument.violations,
    current,
    changedMarkdownFiles: [...changed]
  });
  console.log(`MARKDOWN_VALIDATION_RESULT=${JSON.stringify({
    ...result,
    changedMarkdownFiles: [...changed].sort(),
    changedFileViolations: result.changedFileViolations.length,
    newViolations: result.newViolations.length
  })}`);
  if (result.changedFileViolations.length || result.newViolations.length) {
    for (const violation of [...result.changedFileViolations, ...result.newViolations]) {
      console.error(
        `${violation.file}:${violation.line} ${violation.rule}/${violation.alias} ${violation.detail}`
      );
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'MARKDOWN_BASELINE_INVALID: unknown failure.');
  process.exitCode = 1;
});
