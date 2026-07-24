const AUDIT_ACTION_LABELS: Record<string, string> = {
  'lead.created': 'Lead created',
  'lead.workflow_updated': 'Lead review updated',
  'lead.pipeline_stage_updated': 'Pipeline stage updated',
  'lead.follow_up_updated': 'Follow-up updated',
  'lead.note_added': 'Private note added',
  'lead.erased': 'Lead erased'
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  NEEDS_REVIEW: 'Needs review',
  READY_TO_APPLY: 'Ready to apply',
  HOMEOWNER_REVIEW_PENDING: 'Waiting on homeowner',
  SUBMITTED: 'Submitted',
  INSTALLATION_PENDING: 'Installation pending',
  PAYMENT_DOCS_PENDING: 'Payment documents pending',
  COMPLETED: 'Completed',
  NEW_LEAD: 'New lead',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  SURVEY_BOOKED: 'Survey booked',
  SURVEY_COMPLETED: 'Survey completed',
  QUOTE_SENT: 'Quote sent',
  WON: 'Won',
  LOST: 'Lost'
};

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeStatusLabel(value: unknown) {
  return typeof value === 'string' ? STATUS_LABELS[value] : undefined;
}

export function getAuditActionLabel(action: string) {
  const knownLabel = AUDIT_ACTION_LABELS[action];
  if (knownLabel) return knownLabel;

  const words = action
    .replace(/^lead[._-]/i, '')
    .split(/[._-]+/)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : 'Lead updated';
}

export function getAuditActorLabel(actor: string | null | undefined) {
  const normalized = actor?.trim().toLowerCase();
  if (!normalized) return 'System';
  if (normalized === 'admin' || normalized === 'installer' || normalized === 'installer dashboard') {
    return 'Installer team';
  }
  if (normalized === 'system' || normalized === 'system_actor') return 'System';
  return 'Team member';
}

export function getAuditStatusSummary(metadata: unknown) {
  const record = asRecord(metadata);
  if (!record) return null;

  const previous = safeStatusLabel(
    record.previousStatus ?? record.previousStage ?? record.previousStageKey
  );
  const next = safeStatusLabel(
    record.nextStatus ?? record.nextStage ?? record.nextStageKey
  );

  if (previous && next && previous !== next) return `${previous} to ${next}`;
  if (next) return `Changed to ${next}`;
  return null;
}
