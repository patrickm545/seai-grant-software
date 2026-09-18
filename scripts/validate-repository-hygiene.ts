import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const APPROVED_BASELINE = 'd8a8dc1b8fbd6beebb89344f458366fc43b4a7ba';

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', '.next', 'node_modules', '.tools'].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
  });
}

function gitLines(arguments_: string[]) {
  return execFileSync('git', arguments_, { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function changedFiles() {
  return [...new Set([
    ...gitLines(['diff', '--name-only', APPROVED_BASELINE]),
    ...gitLines(['ls-files', '--others', '--exclude-standard'])
  ])];
}

function validateJson(repositoryRoot: string) {
  const jsonFiles = files(repositoryRoot).filter((file) => extname(file).toLocaleLowerCase() === '.json');
  for (const file of jsonFiles) JSON.parse(readFileSync(file, 'utf8'));
  return jsonFiles.length;
}

function validateLinks(repositoryRoot: string) {
  const markdownFiles = files(join(repositoryRoot, 'docs')).filter((file) => file.endsWith('.md'));
  const unresolved: string[] = [];
  const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const file of markdownFiles) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(linkPattern)) {
      const raw = match[1].replace(/^<|>$/g, '');
      if (/^(?:https?:|mailto:|tel:|#)/i.test(raw)) continue;
      const target = decodeURIComponent(raw.split('#')[0]);
      if (!target) continue;
      const resolved = resolve(dirname(file), target);
      if (!existsSync(resolved) || (!statSync(resolved).isFile() && !statSync(resolved).isDirectory())) {
        unresolved.push(`${file.replace(repositoryRoot, '').replaceAll('\\', '/')}: ${raw}`);
      }
    }
  }
  if (unresolved.length) throw new Error(`DOCUMENT_LINK_VALIDATION_FAILED:\n${unresolved.join('\n')}`);
  return markdownFiles.length;
}

function validateChangedMetadata(repositoryRoot: string, changed: string[]) {
  const candidates = changed.filter(
    (file) => file.startsWith('docs/03-engineering/') && file.endsWith('.md') && !file.endsWith('/README.md')
  );
  const required = ['Document ID', 'Status', 'Owner', 'Review cycle', 'Last reviewed'];
  for (const file of candidates) {
    const source = readFileSync(join(repositoryRoot, file), 'utf8');
    if (!source.startsWith('# ')) throw new Error(`DOCUMENT_METADATA_FAILED: ${file} has no H1.`);
    for (const field of required) {
      if (!source.includes(`| ${field} |`)) {
        throw new Error(`DOCUMENT_METADATA_FAILED: ${file} is missing ${field}.`);
      }
    }
  }
  return candidates.length;
}

function validateChangedSecrets(repositoryRoot: string, changed: string[]) {
  const secretPatterns = [
    /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:gh[opsu]_|sk-|xox[baprs]-)[A-Za-z0-9_-]{16,}/
  ];
  const findings: string[] = [];
  for (const file of changed) {
    const absolute = join(repositoryRoot, file);
    if (!existsSync(absolute) || statSync(absolute).size > 2_000_000) continue;
    const source = readFileSync(absolute, 'utf8');
    if (secretPatterns.some((pattern) => pattern.test(source))) findings.push(file);
  }
  if (findings.length) throw new Error(`SECRET_SCAN_FAILED: ${findings.join(', ')}`);
  return changed.length;
}

function main() {
  const repositoryRoot = process.cwd();
  const changed = changedFiles();
  const jsonCount = validateJson(repositoryRoot);
  const markdownCount = validateLinks(repositoryRoot);
  const metadataCount = validateChangedMetadata(repositoryRoot, changed);
  const secretScannedCount = validateChangedSecrets(repositoryRoot, changed);
  execFileSync('git', ['diff', '--check'], { cwd: repositoryRoot, stdio: 'inherit' });
  console.log(`REPOSITORY_HYGIENE_RESULT=${JSON.stringify({
    result: 'passed',
    jsonFiles: jsonCount,
    markdownFilesWithLinksChecked: markdownCount,
    changedMetadataFiles: metadataCount,
    changedFilesSecretScanned: secretScannedCount,
    diffCheck: 'passed'
  })}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'REPOSITORY_HYGIENE_FAILED: unknown failure.');
  process.exitCode = 1;
}
