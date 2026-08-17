import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  OPERATION_REPORTING_FAILURE_EXIT,
  parseRetainedProductionDiagnostic,
  runFixedProductionEvidenceOperationWithRetention,
  type ProductionEvidenceRetentionDependencies
} from '../../lib/production-evidence-operation-retention';

const repositorySha = 'a'.repeat(40);
const safeReport = {
  reportVersion: 'adr-0024-repository-migration-exact-success/v1',
  migrationName: '20260720100000_tenant_operator_recovery',
  normalizationVersion: 'adr-0024-migration-record-normalization/v1',
  recordCount: 1,
  failures: [{ reason: 'checksum-mismatch' }]
};

function typedDiagnostic(classification: string, report = safeReport) {
  return Buffer.from(
    `${classification}: stage=first-evidence-generation; ` +
      'invariant=first ledger, schema and identity evidence satisfies ADR-0024; ' +
      `Repository migration is not exact; exactSuccessReport=${JSON.stringify(report)}\n`,
    'utf8'
  );
}

function child(input: {
  status: number | null;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
}) {
  return {
    status: input.status,
    signal: null,
    stdout: Buffer.isBuffer(input.stdout)
      ? input.stdout
      : Buffer.from(input.stdout ?? '', 'utf8'),
    stderr: Buffer.isBuffer(input.stderr)
      ? input.stderr
      : Buffer.from(input.stderr ?? '', 'utf8')
  };
}

function runCase(input: {
  status: number | null;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
  configure?: Pick<
    ProductionEvidenceRetentionDependencies,
    | 'hashBytes'
    | 'enrichBoundary'
    | 'serializeFinalBoundary'
    | 'afterChildRetention'
  >;
}) {
  const base = mkdtempSync(join(tmpdir(), 'adr0024-retention-test-'));
  const changeId = 'CHG-2099-01-01-ADR0024-PROD-EVIDENCE-R99';
  let launchCount = 0;
  const times = [
    new Date('2026-08-17T10:00:00.000Z'),
    new Date('2026-08-17T10:00:00.100Z'),
    new Date('2026-08-17T10:00:01.000Z'),
    new Date('2026-08-17T10:00:01.100Z'),
    new Date('2026-08-17T10:00:01.200Z')
  ];
  let timeIndex = 0;
  const result = runFixedProductionEvidenceOperationWithRetention({
    artifactBaseDirectory: base,
    cwd: process.cwd(),
    environment: { NODE_ENV: 'test', PRODUCTION_EVIDENCE_CHANGE_ID: changeId },
    repositoryRevision: () => repositorySha,
    now: () => times[timeIndex++] ?? times[times.length - 1],
    launch: () => {
      launchCount += 1;
      return child(input);
    },
    ...(input.configure ?? {})
  });
  return {
    base,
    changeId,
    operationDirectory: join(base, changeId),
    launchCount: () => launchCount,
    result
  };
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function cleanup(base: string) {
  rmSync(base, { recursive: true, force: true });
}

for (const [status, classification] of [
  [25, 'LEDGER_MISMATCH'],
  [26, 'SCHEMA_MISMATCH'],
  [70, 'INTERNAL_ERROR']
] as const) {
  test(`typed exit ${status} survives reporting and retains structured diagnostic`, () => {
    const operation = runCase({ status, stderr: typedDiagnostic(classification) });
    try {
      assert.equal(operation.result.repositoryExit, status);
      assert.equal(operation.result.wrapperExit, status);
      assert.equal(operation.result.reportingStatus, 'complete');
      assert.equal(operation.result.diagnostic?.classification, classification);
      assert.equal(operation.result.diagnostic?.stage, 'first-evidence-generation');
      assert.deepEqual(operation.result.diagnostic?.structuredReport, safeReport);
      assert.deepEqual(
        readFileSync(join(operation.operationDirectory, 'child-stderr.bin')),
        typedDiagnostic(classification)
      );
      const boundary = readJson(join(operation.operationDirectory, 'operation-boundary.json'));
      assert.equal(boundary.repositoryExit, status);
      assert.equal(boundary.repositoryTypedExit, status);
      assert.equal(boundary.classification, classification);
    } finally {
      cleanup(operation.base);
    }
  });
}

test('child exit zero and stdout are retained without changing exit semantics', () => {
  const operation = runCase({ status: 0, stdout: '{"safe":true}\n' });
  try {
    assert.equal(operation.result.repositoryExit, 0);
    assert.equal(operation.result.wrapperExit, 0);
    assert.equal(operation.result.stdout.toString('utf8'), '{"safe":true}\n');
    assert.deepEqual(
      readFileSync(join(operation.operationDirectory, 'child-stdout.bin')),
      Buffer.from('{"safe":true}\n')
    );
  } finally {
    cleanup(operation.base);
  }
});

test('empty stdout and stderr-only diagnostic remain distinct artifacts', () => {
  const operation = runCase({ status: 25, stderr: typedDiagnostic('LEDGER_MISMATCH') });
  try {
    assert.equal(readFileSync(join(operation.operationDirectory, 'child-stdout.bin')).length, 0);
    assert.ok(readFileSync(join(operation.operationDirectory, 'child-stderr.bin')).length > 0);
  } finally {
    cleanup(operation.base);
  }
});

test('malformed diagnostic remains available raw without fabricated classification', () => {
  const malformed = Buffer.from('safe but malformed diagnostic\n');
  const operation = runCase({ status: 25, stderr: malformed });
  try {
    assert.equal(operation.result.diagnostic, null);
    assert.deepEqual(
      readFileSync(join(operation.operationDirectory, 'child-stderr.bin')),
      malformed
    );
    const boundary = readJson(join(operation.operationDirectory, 'operation-boundary.json'));
    assert.equal(boundary.repositoryExit, 25);
    assert.equal(boundary.classification, null);
  } finally {
    cleanup(operation.base);
  }
});

test('large diagnostics are retained byte-for-byte before enrichment', () => {
  const large = Buffer.from(`INTERNAL_ERROR: ${'x'.repeat(2 * 1024 * 1024)}\n`);
  const operation = runCase({ status: 70, stderr: large });
  try {
    assert.deepEqual(
      readFileSync(join(operation.operationDirectory, 'child-stderr.bin')),
      large
    );
  } finally {
    cleanup(operation.base);
  }
});

test('hashing failure preserves raw output and authoritative child exit', () => {
  const operation = runCase({
    status: 25,
    stderr: typedDiagnostic('LEDGER_MISMATCH'),
    configure: {
      hashBytes: () => {
        throw new Error('synthetic hash failure');
      }
    }
  });
  try {
    assert.equal(operation.result.repositoryExit, 25);
    assert.equal(operation.result.wrapperExit, 25);
    assert.equal(operation.result.reportingStatus, 'failed');
    assert.ok(existsSync(join(operation.operationDirectory, 'child-stderr.bin')));
    assert.ok(existsSync(join(operation.operationDirectory, 'operation-boundary-child-complete.json')));
    const error = readJson(join(operation.operationDirectory, 'reporting-error.json'));
    assert.equal(error.reportingFailureStage, 'hashing');
    assert.equal(error.repositoryExit, 25);
    assert.doesNotMatch(JSON.stringify(error), /synthetic hash failure/);
  } finally {
    cleanup(operation.base);
  }
});

test('JSON serialization failure does not delete primary evidence', () => {
  const operation = runCase({
    status: 26,
    stderr: typedDiagnostic('SCHEMA_MISMATCH'),
    configure: {
      serializeFinalBoundary: () => {
        throw new Error('synthetic JSON failure');
      }
    }
  });
  try {
    assert.equal(operation.result.repositoryExit, 26);
    assert.equal(operation.result.wrapperExit, 26);
    assert.equal(operation.result.reportingStatus, 'failed');
    assert.ok(existsSync(join(operation.operationDirectory, 'child-stderr.bin')));
    assert.equal(existsSync(join(operation.operationDirectory, 'operation-boundary.json')), false);
    assert.equal(
      readJson(join(operation.operationDirectory, 'reporting-error.json')).reportingFailureStage,
      'boundary-serialization'
    );
  } finally {
    cleanup(operation.base);
  }
});

test('report construction failure is separate from the retained child result', () => {
  const operation = runCase({
    status: 70,
    stderr: typedDiagnostic('INTERNAL_ERROR'),
    configure: {
      enrichBoundary: () => {
        throw new Error('synthetic ordered-dictionary/report construction failure');
      }
    }
  });
  try {
    assert.equal(operation.result.repositoryExit, 70);
    assert.equal(operation.result.wrapperExit, 70);
    assert.equal(operation.result.reportingStatus, 'failed');
    assert.ok(existsSync(join(operation.operationDirectory, 'child-stderr.bin')));
    assert.equal(
      readJson(join(operation.operationDirectory, 'reporting-error.json')).reportingFailureStage,
      'boundary-enrichment'
    );
  } finally {
    cleanup(operation.base);
  }
});

test('unexpected exception after child retention cannot trigger a retry', () => {
  const operation = runCase({
    status: 25,
    stderr: typedDiagnostic('LEDGER_MISMATCH'),
    configure: {
      afterChildRetention: () => {
        throw new Error('synthetic post-child exception');
      }
    }
  });
  try {
    assert.equal(operation.launchCount(), 1);
    assert.equal(operation.result.repositoryExit, 25);
    assert.equal(operation.result.wrapperExit, 25);
    assert.ok(existsSync(join(operation.operationDirectory, 'child-stderr.bin')));
  } finally {
    cleanup(operation.base);
  }
});

test('reporting failure after successful child returns the distinct wrapper exit 91', () => {
  const operation = runCase({
    status: 0,
    stdout: 'safe success\n',
    configure: {
      hashBytes: () => {
        throw new Error('synthetic hash failure');
      }
    }
  });
  try {
    assert.equal(operation.result.repositoryExit, 0);
    assert.equal(operation.result.wrapperExit, OPERATION_REPORTING_FAILURE_EXIT);
    assert.equal(operation.result.reportingStatus, 'failed');
    assert.deepEqual(
      readFileSync(join(operation.operationDirectory, 'child-stdout.bin')),
      Buffer.from('safe success\n')
    );
  } finally {
    cleanup(operation.base);
  }
});

test('start, child start, child completion, and reporting timestamps are independently durable', () => {
  const operation = runCase({ status: 0, stdout: 'safe\n' });
  try {
    const start = readJson(join(operation.operationDirectory, 'operation-boundary-start.json'));
    const childStart = readJson(
      join(operation.operationDirectory, 'operation-boundary-child-start.json')
    );
    const childComplete = readJson(
      join(operation.operationDirectory, 'operation-boundary-child-complete.json')
    );
    const final = readJson(join(operation.operationDirectory, 'operation-boundary.json'));
    assert.deepEqual((start.operationStartedAt as Record<string, string>).utc, '2026-08-17T10:00:00.000Z');
    assert.deepEqual((childStart.childStartedAt as Record<string, string>).utc, '2026-08-17T10:00:00.100Z');
    assert.deepEqual((childComplete.childCompletedAt as Record<string, string>).utc, '2026-08-17T10:00:01.000Z');
    assert.deepEqual((final.reportingCompletedAt as Record<string, string>).utc, '2026-08-17T10:00:01.100Z');
    assert.match(
      (start.operationStartedAt as Record<string, string>).europeDublin,
      /\+01:00\[Europe\/Dublin\]$/
    );
  } finally {
    cleanup(operation.base);
  }
});

test('raw artifact SHA-256 hashes use exact retained bytes deterministically', () => {
  const stdout = Buffer.from([0, 1, 2, 3, 10, 13, 255]);
  const stderr = typedDiagnostic('LEDGER_MISMATCH');
  const operation = runCase({ status: 25, stdout, stderr });
  try {
    const boundary = readJson(join(operation.operationDirectory, 'operation-boundary.json'));
    assert.equal(
      (boundary.stdout as Record<string, string>).sha256,
      createHash('sha256').update(stdout).digest('hex')
    );
    assert.equal(
      (boundary.stderr as Record<string, string>).sha256,
      createHash('sha256').update(stderr).digest('hex')
    );
  } finally {
    cleanup(operation.base);
  }
});

test('secret-like child output is never written to retained artifacts', () => {
  const secret = 'postgresql://operator:credential@secret.example/neondb';
  const operation = runCase({ status: 70, stderr: `INTERNAL_ERROR: ${secret}\n` });
  try {
    const retained = readFileSync(join(operation.operationDirectory, 'child-stderr.bin'), 'utf8');
    assert.doesNotMatch(retained, /operator|credential|secret\.example|postgresql/i);
    assert.match(retained, /blocked-secret-like-child-output/);
    const boundary = readJson(join(operation.operationDirectory, 'operation-boundary.json'));
    assert.equal((boundary.stderr as Record<string, unknown>).exactChildBytes, false);
  } finally {
    cleanup(operation.base);
  }
});

test('operation directory reuse fails before a second child launch', () => {
  const base = mkdtempSync(join(tmpdir(), 'adr0024-retention-reuse-'));
  const environment = {
    NODE_ENV: 'test' as const,
    PRODUCTION_EVIDENCE_CHANGE_ID: 'CHG-2099-01-01-ADR0024-PROD-EVIDENCE-R98'
  };
  let launches = 0;
  const input = {
    artifactBaseDirectory: base,
    environment,
    repositoryRevision: () => repositorySha,
    launch: () => {
      launches += 1;
      return child({ status: 25, stderr: typedDiagnostic('LEDGER_MISMATCH') });
    }
  };
  try {
    runFixedProductionEvidenceOperationWithRetention(input);
    assert.throws(
      () => runFixedProductionEvidenceOperationWithRetention(input),
      /artifact directory already exists/
    );
    assert.equal(launches, 1);
  } finally {
    cleanup(base);
  }
});

test('safe diagnostic parser handles stderr-only and rejects malformed input', () => {
  assert.equal(
    parseRetainedProductionDiagnostic(typedDiagnostic('LEDGER_MISMATCH'))?.classification,
    'LEDGER_MISMATCH'
  );
  assert.equal(parseRetainedProductionDiagnostic(Buffer.from('malformed')), null);
  assert.equal(parseRetainedProductionDiagnostic(Buffer.alloc(0)), null);
});
