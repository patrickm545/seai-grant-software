const sensitiveKeyPattern = /(passwordHash|plaintextCredential|sessionToken|tokenHash|cookie|databaseUrl|connectionString|providerApiKey|secret)/i;
const sensitiveValuePattern = /(postgres(?:ql)?:\/\/|^\$argon2|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/;

export type RehearsalAuditRecord = {
  action: string;
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
  expectedActions: readonly string[]
) {
  const present = new Set(audits.map((audit) => audit.action));
  const missing = expectedActions.filter((action) => !present.has(action));
  if (missing.length > 0) throw new Error(`Audit event chain is incomplete: ${missing.join(', ')}.`);
  audits.forEach((audit) => assertRehearsalSecretFree(audit.metadataJson));
  return {
    count: audits.length,
    actions: [...new Set(audits.map((audit) => audit.action))].sort()
  };
}

export function buildRehearsalMarkdown(report: {
  rehearsalId: string;
  databaseFingerprint: string;
  status: 'PASSED' | 'FAILED';
  stages: Array<{ name: string; status: 'PASSED' | 'FAILED'; details?: Record<string, string | number | boolean> }>;
  readinessGaps: string[];
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
  lines.push('', '## Remaining readiness gaps', '');
  for (const gap of report.readinessGaps) lines.push(`- ${gap}`);
  lines.push('');
  return lines.join('\n');
}
