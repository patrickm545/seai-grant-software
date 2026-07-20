const sensitiveKeyPattern = /(passwordHash|plaintextCredential|sessionToken|tokenHash|cookie|databaseUrl|connectionString|providerApiKey|secret)/i;
const sensitiveValuePattern = /(postgres(?:ql)?:\/\/|^\$argon2|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/;

export type RehearsalAuditRecord = {
  action: string;
  createdAt: Date | string;
  metadataJson: unknown;
};

function walkSecretFree(value: unknown, path: string) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkSecretFree(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && sensitiveValuePattern.test(value)) {
      throw new Error(`Secret-like value found at ${path}.`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) throw new Error(`Secret-like field found at ${path}.${key}.`);
    walkSecretFree(child, `${path}.${key}`);
  }
}

export function assertRehearsalSecretFree(value: unknown) {
  walkSecretFree(value, 'value');
}

export function assertAuditEventChain(
  audits: readonly RehearsalAuditRecord[],
  expectedActions: readonly string[],
  expectedCounts: Readonly<Record<string, number>> = {}
) {
  audits.forEach((audit) => assertRehearsalSecretFree(audit.metadataJson));
  const ordered = audits
    .map((audit, index) => {
      const timestamp = new Date(audit.createdAt).getTime();
      if (!Number.isFinite(timestamp)) throw new Error(`Audit event ${audit.action} has an invalid createdAt timestamp.`);
      return { audit, index, timestamp };
    })
    .sort((left, right) => {
      return left.timestamp - right.timestamp || left.index - right.index;
    })
    .map(({ audit }) => audit);
  let cursor = 0;
  for (const expectedAction of expectedActions) {
    const next = ordered.findIndex((audit, index) => index >= cursor && audit.action === expectedAction);
    if (next < 0) throw new Error(`Audit event chain is incomplete or out of order: ${expectedAction}.`);
    cursor = next + 1;
  }
  const actualCounts = ordered.reduce<Record<string, number>>((counts, audit) => {
    counts[audit.action] = (counts[audit.action] ?? 0) + 1;
    return counts;
  }, {});
  for (const [action, expectedCount] of Object.entries(expectedCounts)) {
    const actualCount = actualCounts[action] ?? 0;
    if (actualCount !== expectedCount) {
      throw new Error(`Audit event count for ${action} was ${actualCount}; expected ${expectedCount}.`);
    }
  }
  return {
    count: ordered.length,
    actions: [...new Set(ordered.map((audit) => audit.action))].sort(),
    orderedActions: ordered.map((audit) => audit.action),
    counts: actualCounts
  };
}

export function buildRehearsalMarkdown(report: {
  rehearsalId: string;
  databaseFingerprint: string;
  status: 'PASSED' | 'FAILED';
  stages: Array<{ name: string; status: 'PASSED' | 'FAILED'; details?: Record<string, string | number | boolean> }>;
  readinessGaps: string[];
  cleanup?: {
    discoveredRecordCount: number;
    deletedRecordCount: number;
    remainingRecordCount: number;
    verificationPassed: boolean;
  };
}) {
  assertRehearsalSecretFree(report);
  const lines = [
    '# Pilot onboarding rehearsal',
    '',
    `- Rehearsal: ${report.rehearsalId}`,
    `- Database fingerprint: ${report.databaseFingerprint}`,
    `- Status: ${report.status}`,
    '',
    '## Stages',
    ''
  ];
  for (const stage of report.stages) {
    const detail = stage.details ? ` — ${Object.entries(stage.details).map(([key, value]) => `${key}=${value}`).join(', ')}` : '';
    lines.push(`- ${stage.status}: ${stage.name}${detail}`);
  }
  if (report.cleanup) {
    lines.push(
      '',
      '## Cleanup verification',
      '',
      `- Discovered records: ${report.cleanup.discoveredRecordCount}`,
      `- Deleted records: ${report.cleanup.deletedRecordCount}`,
      `- Remaining records: ${report.cleanup.remainingRecordCount}`,
      `- Verification passed: ${report.cleanup.verificationPassed}`
    );
  }
  lines.push('', '## Remaining readiness gaps', '');
  for (const gap of report.readinessGaps) lines.push(`- ${gap}`);
  lines.push('');
  return lines.join('\n');
}
