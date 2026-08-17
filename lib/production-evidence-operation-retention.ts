import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  writeSync
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import {
  launchFixedProductionEvidenceCaptureRaw,
  type RawPackageManagerLaunchOptions
} from './fixed-package-script-launcher';

export const PRODUCTION_EVIDENCE_OPERATION_RETENTION_VERSION =
  'adr-0024-operation-retention/v1' as const;
export const OPERATION_REPORTING_FAILURE_EXIT = 91 as const;

const changeIdPattern =
  /^CHG-\d{4}-\d{2}-\d{2}-ADR0024-PROD-EVIDENCE(?:-R\d+)?$/;
const repositoryShaPattern = /^[a-f0-9]{40}$/;
const typedRepositoryExits = new Set([20, 21, 23, 24, 25, 26, 27, 70]);
const prohibitedOutputPatterns = [
  /postgres(?:ql)?:\/\/[^\s]+/i,
  /\bDATABASE_URL\s*=/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)\s*[:=]\s*[^\s,}\]]+/i
];

type TimestampEvidence = {
  utc: string;
  europeDublin: string;
};

export type RetainedDiagnostic = {
  classification: string;
  stage: string | null;
  invariant: string | null;
  message: string;
  structuredReportKind: 'exactSuccessReport' | 'mismatchReport' | null;
  structuredReport: unknown | null;
};

type RawChildResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
};

export type ProductionEvidenceRetentionDependencies = {
  artifactBaseDirectory?: string;
  cwd?: string;
  environment?: NodeJS.ProcessEnv;
  now?: () => Date;
  repositoryRevision?: () => string;
  launch?: (options: RawPackageManagerLaunchOptions) => RawChildResult;
  hashBytes?: (bytes: Buffer) => string;
  enrichBoundary?: (boundary: Record<string, unknown>) => Record<string, unknown>;
  serializeFinalBoundary?: (boundary: Record<string, unknown>) => Buffer;
  afterChildRetention?: () => void;
};

export type ProductionEvidenceOperationRetentionResult = {
  artifactDirectory: string;
  diagnostic: RetainedDiagnostic | null;
  reportingStatus: 'complete' | 'failed';
  repositoryExit: number | null;
  stdout: Buffer;
  stderr: Buffer;
  wrapperExit: number;
};

function exactTimestamp(date: Date): TimestampEvidence {
  const utc = date.toISOString();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hourCycle: 'h23',
    timeZoneName: 'longOffset'
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const offset = value('timeZoneName').replace('GMT', '') || '+00:00';
  return {
    utc,
    europeDublin:
      `${value('year')}-${value('month')}-${value('day')}T` +
      `${value('hour')}:${value('minute')}:${value('second')}.` +
      `${value('fractionalSecond')}${offset}[Europe/Dublin]`
  };
}

function jsonBytes(value: unknown) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeDurableAtomic(path: string, bytes: Buffer) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    let offset = 0;
    while (offset < bytes.length) {
      offset += writeSync(descriptor, bytes, offset, bytes.length - offset);
    }
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
    // Persist the directory entry where the host supports directory fsync.
    // Windows rejects opening directories this way, while the file itself has
    // already been flushed and the rename has completed atomically.
    let directoryDescriptor: number | undefined;
    try {
      directoryDescriptor = openSync(dirname(path), 'r');
      fsyncSync(directoryDescriptor);
    } catch {
      // Best-effort cross-platform directory durability only.
    } finally {
      if (directoryDescriptor !== undefined) closeSync(directoryDescriptor);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) rmSync(temporary, { force: true });
  }
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeRetainedStream(bytes: Buffer, stream: 'stdout' | 'stderr') {
  const text = bytes.toString('utf8');
  const secretLike = prohibitedOutputPatterns.some((pattern) => pattern.test(text));
  if (!secretLike) return { bytes, exact: true };
  return {
    bytes: jsonBytes({
      version: PRODUCTION_EVIDENCE_OPERATION_RETENTION_VERSION,
      stream,
      retention: 'blocked-secret-like-child-output',
      originalByteLength: bytes.length
    }),
    exact: false
  };
}

function parseFirstJsonObject(text: string, marker: string) {
  const markerIndex = text.indexOf(`${marker}=`);
  if (markerIndex < 0) return null;
  const start = text.indexOf('{', markerIndex + marker.length + 1);
  if (start < 0) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function parseRetainedProductionDiagnostic(stderr: Buffer) {
  const text = stderr.toString('utf8').trim();
  if (!text) return null;
  const header = text.match(
    /^([A-Z][A-Z0-9_]+):\s*(?:stage=([^;\r\n]+);\s*invariant=([^;\r\n]+);\s*)?([\s\S]*)$/
  );
  if (!header) return null;
  const exactSuccessReport = parseFirstJsonObject(text, 'exactSuccessReport');
  const mismatchReport = parseFirstJsonObject(text, 'mismatchReport');
  return {
    classification: header[1],
    stage: header[2]?.trim() ?? null,
    invariant: header[3]?.trim() ?? null,
    message: header[4].trim(),
    structuredReportKind: exactSuccessReport
      ? ('exactSuccessReport' as const)
      : mismatchReport
        ? ('mismatchReport' as const)
        : null,
    structuredReport: exactSuccessReport ?? mismatchReport
  } satisfies RetainedDiagnostic;
}

function defaultRepositoryRevision(cwd: string) {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8'
  }).trim();
}

function safeReportingFailure(error: unknown) {
  return {
    code: 'REPORTING_LAYER_FAILURE',
    errorType: error instanceof Error ? error.name : 'UnknownError'
  } as const;
}

export function runFixedProductionEvidenceOperationWithRetention(
  dependencies: ProductionEvidenceRetentionDependencies = {}
): ProductionEvidenceOperationRetentionResult {
  const environment = dependencies.environment ?? process.env;
  const cwd = dependencies.cwd ?? process.cwd();
  const changeId = environment.PRODUCTION_EVIDENCE_CHANGE_ID?.trim() ?? '';
  if (!changeIdPattern.test(changeId)) {
    throw new Error('OPERATION_RETENTION_UNSAFE: Production evidence change ID is invalid.');
  }
  const revision = (dependencies.repositoryRevision ?? (() => defaultRepositoryRevision(cwd)))();
  if (!repositoryShaPattern.test(revision)) {
    throw new Error('OPERATION_RETENTION_UNSAFE: repository revision is invalid.');
  }

  const artifactBase = resolve(
    dependencies.artifactBaseDirectory ?? join(homedir(), '.clada-systems', 'ADR0024')
  );
  mkdirSync(artifactBase, { recursive: true, mode: 0o700 });
  const operationDirectory = join(artifactBase, changeId);
  if (dirname(operationDirectory) !== artifactBase || basename(operationDirectory) !== changeId) {
    throw new Error('OPERATION_RETENTION_UNSAFE: operation artifact path is invalid.');
  }
  if (existsSync(operationDirectory)) {
    throw new Error('OPERATION_RETENTION_UNSAFE: operation artifact directory already exists.');
  }
  mkdirSync(operationDirectory, { recursive: false, mode: 0o700 });

  const clock = dependencies.now ?? (() => new Date());
  const operationStartedAt = exactTimestamp(clock());
  writeDurableAtomic(
    join(operationDirectory, 'operation-boundary-start.json'),
    jsonBytes({
      version: PRODUCTION_EVIDENCE_OPERATION_RETENTION_VERSION,
      phase: 'operation-started',
      changeId,
      repositorySha: revision,
      operationStartedAt,
      reportingStatus: 'not-started'
    })
  );

  const childStartedAt = exactTimestamp(clock());
  writeDurableAtomic(
    join(operationDirectory, 'operation-boundary-child-start.json'),
    jsonBytes({
      version: PRODUCTION_EVIDENCE_OPERATION_RETENTION_VERSION,
      phase: 'child-started',
      changeId,
      repositorySha: revision,
      operationStartedAt,
      childStartedAt,
      fixedCommand: 'node --import tsx scripts/launch-production-evidence-capture.ts'
    })
  );

  const child = (dependencies.launch ?? launchFixedProductionEvidenceCaptureRaw)({
    cwd,
    env: environment
  });
  const childCompletedAt = exactTimestamp(clock());
  const retainedStdout = safeRetainedStream(child.stdout, 'stdout');
  const retainedStderr = safeRetainedStream(child.stderr, 'stderr');
  const stdoutReference = 'child-stdout.bin';
  const stderrReference = 'child-stderr.bin';
  writeDurableAtomic(join(operationDirectory, stdoutReference), retainedStdout.bytes);
  writeDurableAtomic(join(operationDirectory, stderrReference), retainedStderr.bytes);

  const repositoryExit = child.status;
  const wrapperExit =
    repositoryExit === null ? OPERATION_REPORTING_FAILURE_EXIT : repositoryExit;
  const childCompleteBoundary = {
    version: PRODUCTION_EVIDENCE_OPERATION_RETENTION_VERSION,
    phase: 'child-complete',
    changeId,
    repositorySha: revision,
    operationStartedAt,
    childStartedAt,
    childCompletedAt,
    repositoryExit,
    childSignal: child.signal,
    stdout: {
      reference: stdoutReference,
      bytes: retainedStdout.bytes.length,
      exactChildBytes: retainedStdout.exact
    },
    stderr: {
      reference: stderrReference,
      bytes: retainedStderr.bytes.length,
      exactChildBytes: retainedStderr.exact
    },
    reportingStatus: 'pending'
  };
  writeDurableAtomic(
    join(operationDirectory, 'operation-boundary-child-complete.json'),
    jsonBytes(childCompleteBoundary)
  );

  let stage = 'post-child-retention';
  try {
    dependencies.afterChildRetention?.();
    stage = 'hashing';
    const hashBytes = dependencies.hashBytes ?? sha256;
    const stdoutSha256 = hashBytes(retainedStdout.bytes);
    const stderrSha256 = hashBytes(retainedStderr.bytes);
    stage = 'diagnostic-parsing';
    const diagnostic = retainedStderr.exact
      ? parseRetainedProductionDiagnostic(retainedStderr.bytes)
      : null;
    if (diagnostic) {
      writeDurableAtomic(
        join(operationDirectory, 'diagnostic.json'),
        jsonBytes({
          version: PRODUCTION_EVIDENCE_OPERATION_RETENTION_VERSION,
          repositoryExit,
          ...diagnostic
        })
      );
    }
    stage = 'boundary-enrichment';
    const reportingCompletedAt = exactTimestamp(clock());
    const baseFinalBoundary: Record<string, unknown> = {
      ...childCompleteBoundary,
      phase: 'reporting-complete',
      repositoryTypedExit:
        repositoryExit !== null && typedRepositoryExits.has(repositoryExit)
          ? repositoryExit
          : null,
      classification: diagnostic?.classification ?? null,
      stage: diagnostic?.stage ?? null,
      invariant: diagnostic?.invariant ?? null,
      stdout: {
        ...childCompleteBoundary.stdout,
        sha256: stdoutSha256
      },
      stderr: {
        ...childCompleteBoundary.stderr,
        sha256: stderrSha256
      },
      diagnosticReference: diagnostic ? 'diagnostic.json' : null,
      reportingCompletedAt,
      reportingStatus: 'complete',
      wrapperExit
    };
    const finalBoundary = dependencies.enrichBoundary
      ? dependencies.enrichBoundary(baseFinalBoundary)
      : baseFinalBoundary;
    stage = 'boundary-serialization';
    const serialized = dependencies.serializeFinalBoundary
      ? dependencies.serializeFinalBoundary(finalBoundary)
      : jsonBytes(finalBoundary);
    stage = 'boundary-write';
    writeDurableAtomic(join(operationDirectory, 'operation-boundary.json'), serialized);
    return {
      artifactDirectory: operationDirectory,
      diagnostic,
      reportingStatus: 'complete',
      repositoryExit,
      stdout: retainedStdout.bytes,
      stderr: retainedStderr.bytes,
      wrapperExit
    };
  } catch (error) {
    const reportingCompletedAt = exactTimestamp(clock());
    const reportingFailure = {
      version: PRODUCTION_EVIDENCE_OPERATION_RETENTION_VERSION,
      phase: 'reporting-failed',
      changeId,
      repositorySha: revision,
      repositoryExit,
      wrapperExit:
        repositoryExit !== null && repositoryExit !== 0
          ? repositoryExit
          : OPERATION_REPORTING_FAILURE_EXIT,
      reportingStatus: 'failed',
      reportingFailureStage: stage,
      reportingCompletedAt,
      ...safeReportingFailure(error)
    };
    try {
      writeDurableAtomic(
        join(operationDirectory, 'reporting-error.json'),
        jsonBytes(reportingFailure)
      );
    } catch {
      // The start, child-start, raw streams and child-complete boundary were
      // already durably retained before optional reporting began.
    }
    return {
      artifactDirectory: operationDirectory,
      diagnostic: retainedStderr.exact
        ? parseRetainedProductionDiagnostic(retainedStderr.bytes)
        : null,
      reportingStatus: 'failed',
      repositoryExit,
      stdout: retainedStdout.bytes,
      stderr: retainedStderr.bytes,
      wrapperExit:
        repositoryExit !== null && repositoryExit !== 0
          ? repositoryExit
          : OPERATION_REPORTING_FAILURE_EXIT
    };
  }
}
