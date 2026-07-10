import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import type { ReactNode } from 'react';
import { CopyTextButton } from '@/components/CopyTextButton';
import {
  addLeadNote,
  regenerateLeadPortalTokenAction,
  setLeadFollowUp,
  updateLeadDocumentStatus,
  updateLeadPipelineStage
} from '@/app/installer-review-emerald/actions';
import { prisma } from '@/lib/prisma';
import { adminWorkflowSchema } from '@/lib/validation';
import { writeAuditLog } from '@/lib/audit';
import { formatPricingCurrency, parseGeneratedInstallerQuote } from '@/lib/installer-quote-pricing';
import { requireDefaultInstallerOrganisationContext } from '@/lib/identity';
import {
  deleteLeadInOrganisation,
  leadActivityOrganisationWhere,
  leadOrganisationWhere,
  updateLeadInOrganisation
} from '@/lib/lead-access';
import {
  buildDocumentChecklist,
  formatDocumentSize,
  getDocumentStatusLabel,
  getDocumentStatusTone,
  getUploadedByLabel
} from '@/lib/documents';
import { buildPortalUrl, ensureLeadPortalToken } from '@/lib/portal';
import {
  getActivityTone,
  getActivityTypeLabel,
  getLeadScoreLabel,
  getLeadScoreTone,
  getPipelineStageLabel,
  getPipelineStageTone,
  leadPipelineStages
} from '@/lib/crm';

const ADMIN_BASE_PATH = '/installer-review-emerald/leads';
export const dynamic = 'force-dynamic';

type LeadDetail = Prisma.LeadGetPayload<{
  include: { installer: true; documents: true };
}>;

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  NEEDS_REVIEW: 'Needs review',
  READY_TO_APPLY: 'Ready to apply',
  HOMEOWNER_REVIEW_PENDING: 'Waiting on homeowner',
  SUBMITTED: 'Submitted',
  INSTALLATION_PENDING: 'Installation pending',
  PAYMENT_DOCS_PENDING: 'Payment docs pending',
  COMPLETED: 'Completed'
};
const STATUS_OPTIONS = Object.keys(STATUS_LABELS);
const quickStageActions = [
  { stage: 'CONTACTED', label: 'Mark Contacted' },
  { stage: 'QUALIFIED', label: 'Mark Qualified' },
  { stage: 'SURVEY_BOOKED', label: 'Book Survey' },
  { stage: 'SURVEY_COMPLETED', label: 'Mark Survey Completed' },
  { stage: 'QUOTE_SENT', label: 'Mark Quote Sent' },
  { stage: 'WON', label: 'Mark Won' },
  { stage: 'LOST', label: 'Mark Lost' }
] as const;

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value || '').trim();
  return text || null;
}

function parseFollowUpDate(value: FormDataEntryValue | null) {
  const text = String(value || '').trim();
  if (!text) return null;

  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid follow-up date');
  }

  return date;
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true';
}

function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

async function updateLeadWorkflow(formData: FormData) {
  'use server';

  const organisationContext = await requireDefaultInstallerOrganisationContext();
  const leadId = String(formData.get('leadId') || '');
  const action = String(formData.get('workflowAction') || 'save');
  const selectedStatus = String(formData.get('status') || 'NEEDS_REVIEW');
  const workflowStatusByAction: Record<string, string> = {
    'mark-ready': 'READY_TO_APPLY',
    'mark-needs-review': 'NEEDS_REVIEW',
    'mark-contacted': 'HOMEOWNER_REVIEW_PENDING',
    'mark-quoted': 'READY_TO_APPLY',
    'mark-won': 'COMPLETED',
    'mark-lost': 'NEEDS_REVIEW'
  };
  const status = workflowStatusByAction[action] ?? selectedStatus;

  if (!leadId) {
    throw new Error('Lead id is required');
  }

  const parsed = adminWorkflowSchema.parse({
    status,
    internalNotes: optionalText(formData.get('internalNotes')),
    followUpDate: parseFollowUpDate(formData.get('followUpDate')),
    assignedAdmin: optionalText(formData.get('assignedAdmin')),
    assignedInstaller: optionalText(formData.get('assignedInstaller')),
    currentCrmProcess: optionalText(formData.get('currentCrmProcess')),
    installerSize: optionalText(formData.get('installerSize')),
    objections: optionalText(formData.get('objections')),
    painPoints: optionalText(formData.get('painPoints')),
    likelihoodToBuy: optionalText(formData.get('likelihoodToBuy')),
    leadSource: optionalText(formData.get('leadSource')),
    researchCallCompleted: parseCheckbox(formData.get('researchCallCompleted')),
    salesCallRequired: parseCheckbox(formData.get('salesCallRequired'))
  });

  await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id: leadId }),
      select: { status: true, followUpDate: true, nextFollowUpAt: true }
    });

    if (!existingLead) {
      throw new Error('Lead not found');
    }

    await updateLeadInOrganisation(tx, organisationContext, leadId, {
      ...parsed,
      nextFollowUpAt: parsed.followUpDate
    });

    const previousFollowUpAt = existingLead?.nextFollowUpAt ?? existingLead?.followUpDate ?? null;
    const nextFollowUpAt = parsed.followUpDate ?? null;
    const previousFollowUpTime = previousFollowUpAt?.getTime() ?? null;
    const nextFollowUpTime = nextFollowUpAt?.getTime() ?? null;

    if (previousFollowUpTime !== nextFollowUpTime) {
      await tx.leadActivity.create({
        data: {
          leadId,
          type: 'FOLLOW_UP_SET',
          title: nextFollowUpAt ? 'Follow-up date set' : 'Follow-up date cleared',
          description: nextFollowUpAt
            ? `Next follow-up scheduled for ${nextFollowUpAt.toISOString().slice(0, 10)}`
            : 'No follow-up date is currently scheduled.',
          metadata: {
            previousFollowUpAt: previousFollowUpAt?.toISOString() ?? null,
            nextFollowUpAt: nextFollowUpAt?.toISOString() ?? null
          },
          createdBy: 'Installer dashboard',
          createdByRole: 'INSTALLER'
        }
      });
    }

    await writeAuditLog(tx, {
      leadId,
      action: 'lead.workflow_updated',
      actor: 'admin',
      metadata: {
        workflowAction: action,
        previousStatus: existingLead?.status ?? null,
        nextStatus: parsed.status,
        followUpDate: parsed.followUpDate?.toISOString() ?? null,
        researchCallCompleted: parsed.researchCallCompleted,
        salesCallRequired: parsed.salesCallRequired,
        organisationId: organisationContext.organisationId
      }
    });
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/installer-review-emerald/leads/${leadId}`);
  revalidatePath('/installer-review-emerald/leads');
  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/dashboard/leads/${leadId}/application-pack`);
  revalidatePath(`/admin/dashboard/leads/${leadId}/application-pack/print`);
}

async function eraseLeadData(formData: FormData) {
  'use server';

  const organisationContext = await requireDefaultInstallerOrganisationContext();
  const leadId = String(formData.get('leadId') || '');
  const confirmation = String(formData.get('eraseConfirmation') || '').trim();

  if (!leadId || confirmation !== 'ERASE') {
    throw new Error('Type ERASE to confirm homeowner record erasure.');
  }

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id: leadId }),
      select: {
        id: true,
        status: true,
        installerId: true,
        documents: { select: { id: true } }
      }
    });

    if (!lead) return;

    await deleteLeadInOrganisation(tx, organisationContext, leadId);
    await writeAuditLog(tx, {
      leadId,
      action: 'lead.erased',
      actor: 'admin',
      metadata: {
        statusAtErasure: lead.status,
        installerId: lead.installerId,
        organisationId: organisationContext.organisationId,
        documentCount: lead.documents.length,
        reason: 'admin_erasure_request'
      }
    });
  });

  revalidatePath('/admin/dashboard');
  revalidatePath('/installer-review-emerald/leads');
  redirect('/installer-review-emerald/leads');
}

function getStatusTone(status: string) {
  if (status === 'READY_TO_APPLY' || status === 'SUBMITTED' || status === 'COMPLETED') return 'success';
  if (status === 'NEEDS_REVIEW') return 'danger';
  if (status === 'HOMEOWNER_REVIEW_PENDING' || status === 'PAYMENT_DOCS_PENDING' || status === 'INSTALLATION_PENDING') {
    return 'warning';
  }

  return 'default';
}

function getLeadTempTone(temp: string | null) {
  if (temp === 'HOT') return 'success';
  if (temp === 'COLD') return 'danger';
  return 'warning';
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getSalesSignal(value: unknown) {
  const root = asRecord(value);
  return asRecord(root?.salesSignal);
}

function formatRange(value: unknown, prefix = '') {
  const range = asRecord(value);
  const min = range?.min;
  const max = range?.max;

  if (typeof min !== 'number' || typeof max !== 'number') return 'Not supplied';

  return `${prefix}${min.toLocaleString('en-IE')}-${prefix}${max.toLocaleString('en-IE')}`;
}

function formatNumber(value: unknown, suffix = '') {
  return typeof value === 'number' ? `${value.toLocaleString('en-IE')}${suffix}` : 'Not supplied';
}

function formatGrantEstimate(value: unknown) {
  if (typeof value !== 'number') return 'Not supplied';
  return value > 0 ? `EUR ${value.toLocaleString('en-IE')}` : 'Review needed';
}

function formatPayback(value: unknown) {
  const range = asRecord(value);
  const min = range?.min;
  const max = range?.max;

  if (typeof min !== 'number' || typeof max !== 'number') return 'Not supplied';

  return `${min}-${max} years`;
}

function formatEnumValue(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return 'Not supplied';
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace('Asap', 'ASAP')
    .replace('Mprn', 'MPRN')
    .replace('Ev ', 'EV ');
}

function formatBoolean(value: unknown) {
  return value ? 'Yes' : 'No';
}

function formatPercent(value: unknown) {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : 'Not supplied';
}

function formatKwp(value: unknown) {
  return typeof value === 'number' ? `${value.toFixed(1)} kWp` : 'Not supplied';
}

function formatEuroValue(value: unknown) {
  return typeof value === 'number' ? `EUR ${value.toLocaleString('en-IE')}` : 'Not supplied';
}

function formatEuroRangeValue(value: unknown) {
  return formatRange(value, 'EUR ');
}

function formatKwhRangeValue(value: unknown) {
  const range = asRecord(value);
  const min = range?.min;
  const max = range?.max;
  if (typeof min !== 'number' || typeof max !== 'number') return 'Not supplied';
  return `${min.toLocaleString('en-IE')}-${max.toLocaleString('en-IE')} kWh`;
}

function getStringValue(value: unknown, fallback = 'Not supplied') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getNoteEntries(notes: string | null | undefined) {
  if (!notes) return [];

  return notes
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex === -1) return { label: 'Note', value: entry };
      return {
        label: entry.slice(0, separatorIndex).trim(),
        value: entry.slice(separatorIndex + 1).trim()
      };
    });
}

function getNoteValue(entries: Array<{ label: string; value: string }>, label: string) {
  return entries.find((entry) => entry.label.toLowerCase() === label.toLowerCase())?.value;
}

function formatNoteValue(label: string, value: string) {
  const enumLikeLabels = ['roof type', 'install timeline', 'bill range', 'roof direction', 'shading', 'daytime usage', 'lead temperature', 'preferred callback'];
  return enumLikeLabels.some((item) => label.toLowerCase().includes(item)) ? formatEnumValue(value) : value;
}

function DetailMetric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  return (
    <div className={`structured-metric structured-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StructuredField({ label, value }: { label: string; value: string }) {
  return (
    <div className="structured-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StructuredSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="structured-section-card">
      <h3>{title}</h3>
      <dl className="structured-field-grid">{children}</dl>
    </article>
  );
}

function LeadCard({
  eyebrow,
  title,
  actions,
  children,
  className = ''
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`lead-crm-card ${className}`.trim()}>
      <div className="lead-crm-card-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        {actions ? <div className="lead-crm-card-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function LeadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="lead-crm-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default async function HiddenLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organisationContext = await requireDefaultInstallerOrganisationContext();
  const lead: LeadDetail | null = await prisma.lead.findFirst({
    where: leadOrganisationWhere(organisationContext, { id }),
    include: {
      installer: true,
      documents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!lead) return notFound();

  const portalAccess = await ensureLeadPortalToken(lead.id);
  const portalToken = portalAccess.portalToken;
  if (!portalToken) {
    throw new Error('Portal token could not be created');
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: 'desc' },
    take: 8
  });
  const activities = await prisma.leadActivity.findMany({
    where: leadActivityOrganisationWhere(organisationContext, { leadId: lead.id }),
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  const missingItems = asStringArray(lead.missingItemsJson);
  const risks = asStringArray(lead.risksJson);
  const exportData = asRecord(lead.structuredExportJson);
  const salesSignal = getSalesSignal(lead.structuredExportJson);
  const quoteEstimate = asRecord(exportData?.quoteEstimate);
  const generatedQuote = parseGeneratedInstallerQuote(lead.generatedQuoteJson);
  const leadTemperature = typeof salesSignal?.leadTemperature === 'string' ? salesSignal.leadTemperature : 'WARM';
  const noteEntries = getNoteEntries(lead.notes);
  const grantWarnings = asStringArray(quoteEstimate?.grantWarnings);
  const exportWarnings = [
    ...grantWarnings,
    ...missingItems.map((item) => `Missing: ${item}`),
    ...risks.map((risk) => `Risk: ${risk}`)
  ];
  const mprnWarnings = [
    /^\d{11}$/.test(lead.mprn) ? null : 'MPRN is not an 11-digit value.',
    lead.worksStarted ? 'Works appear to have started before grant approval.' : null,
    lead.priorSolarGrantAtMprn ? 'Prior solar grant recorded at this MPRN.' : null
  ].filter((item): item is string => Boolean(item));
  const grantLikely = quoteEstimate?.grantLikely === true || lead.likelyEligible === true;
  const copyQuoteSummary = [
    `Recommended system: ${formatKwp(quoteEstimate?.recommendedSystemSizeKwp)}`,
    `Estimated panels: ${formatNumber(quoteEstimate?.estimatedPanelCount)}`,
    `Net quote range: ${formatEuroRangeValue(quoteEstimate?.netCostRangeAfterGrant)}`,
    `Annual savings: ${formatEuroRangeValue(quoteEstimate?.estimatedAnnualSavingsRange)}`,
    `Payback: ${formatPayback(quoteEstimate?.estimatedPaybackRangeYears)}`,
    `Grant status: ${getStringValue(quoteEstimate?.grantStatus, grantLikely ? 'Likely eligible, subject to SEAI approval.' : 'Review needed')}`
  ].join('\n');
  const copyHomeownerSummary = [
    `Applicant: ${lead.fullName}`,
    `County: ${lead.county}`,
    `MPRN: ${lead.mprn}`,
    `Roof type: ${formatEnumValue(salesSignal?.roofType ?? getNoteValue(noteEntries, 'Roof type'))}`,
    `Install timeline: ${formatEnumValue(salesSignal?.installTimeline ?? getNoteValue(noteEntries, 'Install timeline'))}`,
    `Bill range: ${formatEnumValue(salesSignal?.monthlyElectricityBillRange ?? getNoteValue(noteEntries, 'Bill range'))}`,
    `Battery interest: ${formatBoolean(salesSignal?.batteryInterest ?? salesSignal?.wantsBattery)}`,
    `Recommended next action: ${getStringValue(salesSignal?.recommendedNextAction ?? quoteEstimate?.recommendedNextAction)}`
  ].join('\n');
  const rawExportJson = JSON.stringify(exportData ?? {}, null, 2);
  const allWarnings = [...mprnWarnings, ...exportWarnings];
  const addressSummary = [lead.addressLine1, lead.addressLine2, lead.county, lead.eircode].filter(Boolean).join(', ');
  const eligibilityLabel = lead.likelyEligible === null ? 'Pending review' : lead.likelyEligible ? 'Likely eligible' : 'Needs review';
  const confidenceLabel = lead.eligibilityConfidence === null ? 'Not scored' : formatPercent(lead.eligibilityConfidence);
  const consentCaptured = lead.consentToProcess && lead.consentToGrantAssist && lead.consentToContact;
  const nextRecommendedAction = getStringValue(
    salesSignal?.recommendedNextAction ?? quoteEstimate?.recommendedNextAction,
    'Review eligibility, call homeowner, and confirm documents.'
  );
  const installTimeline = formatEnumValue(salesSignal?.installTimeline ?? getNoteValue(noteEntries, 'Install timeline'));
  const callbackWindow = formatEnumValue(
    salesSignal?.callbackWindow ?? salesSignal?.preferredCallbackWindow ?? getNoteValue(noteEntries, 'Preferred callback')
  );
  const roofType = formatEnumValue(salesSignal?.roofType ?? getNoteValue(noteEntries, 'Roof type'));
  const roofDirection = formatEnumValue(salesSignal?.roofDirection ?? getNoteValue(noteEntries, 'Roof direction'));
  const shadingLevel = formatEnumValue(salesSignal?.shadingLevel ?? getNoteValue(noteEntries, 'Shading'));
  const monthlyBillRange = formatEnumValue(salesSignal?.monthlyElectricityBillRange ?? getNoteValue(noteEntries, 'Bill range'));
  const recommendedSystemSize = formatKwp(quoteEstimate?.recommendedSystemSizeKwp ?? quoteEstimate?.selectedSystemSizeKwp);
  const netQuoteRange = formatEuroRangeValue(quoteEstimate?.netCostRangeAfterGrant);
  const grossQuoteRange = formatEuroRangeValue(quoteEstimate?.grossCostRange);
  const annualSavingsRange = formatEuroRangeValue(quoteEstimate?.estimatedAnnualSavingsRange);
  const paybackRange = formatPayback(quoteEstimate?.estimatedPaybackRangeYears);
  const lastActivity = activities[0] ?? null;
  const lastActivityLabel = lastActivity ? formatDateTime(lastActivity.createdAt) : formatDateTime(lead.updatedAt);
  const nextFollowUpDate = lead.nextFollowUpAt ?? lead.followUpDate;
  const documentChecklist = buildDocumentChecklist(lead.documents);
  const portalUrl = buildPortalUrl(portalToken);

  return (
    <main className="container admin-shell lead-crm-shell">
      <section className="lead-crm-header">
        <div className="lead-crm-topbar">
          <Link href={ADMIN_BASE_PATH} className="small">Back to leads</Link>
          <Link href="/admin/logout" className="small">Log out</Link>
        </div>
        <div className="lead-crm-header-grid">
          <div className="lead-crm-title-block">
            <div className="eyebrow">Lead detail</div>
            <h1>{lead.fullName}</h1>
            <p>
              CRM view for pipeline stage, sales fit, grant readiness, documents, notes, and next workflow actions.
            </p>
            <div className="lead-crm-chip-row">
              <span className={`status-pill status-pill-${getPipelineStageTone(lead.pipelineStage)}`}>{getPipelineStageLabel(lead.pipelineStage)}</span>
              <span className={`status-pill status-pill-${getLeadScoreTone(lead.leadScore)}`}>{getLeadScoreLabel(lead.leadScore)}</span>
              <span className={`status-pill status-pill-${getStatusTone(lead.status)}`}>{STATUS_LABELS[lead.status]}</span>
              <span className={`status-pill status-pill-${getLeadTempTone(leadTemperature)}`}>{leadTemperature} lead</span>
              <span className={`status-pill status-pill-${grantLikely ? 'success' : 'warning'}`}>
                {grantLikely ? 'Grant likely' : 'Grant review'}
              </span>
              <span className="status-pill status-pill-default">{installTimeline}</span>
            </div>
          </div>
          <div className="lead-crm-header-actions">
            <CopyTextButton text={copyHomeownerSummary} label="Copy homeowner summary" />
            <Link href={`/admin/dashboard/leads/${lead.id}/application-pack`} className="lead-crm-button lead-crm-button-primary">Open application pack</Link>
            <a href={`/admin/dashboard/leads/${lead.id}/application-pack/print`} className="lead-crm-button" target="_blank" rel="noreferrer">Print summary</a>
          </div>
        </div>
      </section>

      <section className="lead-crm-summary-grid">
        <div className="lead-crm-kpi lead-crm-kpi-info">
          <span>Pipeline stage</span>
          <strong>{getPipelineStageLabel(lead.pipelineStage)}</strong>
          <small>Last activity {lastActivityLabel}</small>
        </div>
        <div className={`lead-crm-kpi lead-crm-kpi-${getLeadScoreTone(lead.leadScore)}`}>
          <span>Lead score</span>
          <strong>{getLeadScoreLabel(lead.leadScore)}</strong>
          <small>Updated {formatDateTime(lead.scoreUpdatedAt ?? lead.createdAt)}</small>
        </div>
        <div className="lead-crm-kpi lead-crm-kpi-success">
          <span>Recommended system</span>
          <strong>{recommendedSystemSize}</strong>
          <small>{formatNumber(quoteEstimate?.estimatedPanelCount)} panels estimated</small>
        </div>
        <div className="lead-crm-kpi lead-crm-kpi-info">
          <span>Estimated quote</span>
          <strong>{netQuoteRange}</strong>
          <small>{annualSavingsRange} annual savings</small>
        </div>
      </section>

      <div className="lead-crm-layout">
        <div className="lead-crm-main">
          <LeadCard eyebrow="Lead overview" title="Operational summary">
            <div className="lead-crm-overview-row">
              <div className="lead-crm-ai-summary">
                <p>{lead.aiSummary || 'No AI analysis yet. Review the homeowner details and Application Pack before submission.'}</p>
                <div className="lead-crm-next-action">
                  <span>Next recommended action</span>
                  <strong>{nextRecommendedAction}</strong>
                </div>
              </div>
              <div className="lead-crm-field-grid lead-crm-overview-fields">
                <LeadField label="Installer" value={lead.installer.name} />
                <LeadField label="Pipeline stage" value={getPipelineStageLabel(lead.pipelineStage)} />
                <LeadField label="Lead score" value={getLeadScoreLabel(lead.leadScore)} />
                <LeadField label="Grant workflow" value={STATUS_LABELS[lead.status]} />
                <LeadField label="Follow-up date" value={formatDateInput(nextFollowUpDate) || 'Not scheduled'} />
                <LeadField label="Last contacted" value={formatDateTime(lead.lastContactedAt)} />
                <LeadField label="Assigned admin" value={lead.assignedAdmin || 'Unassigned'} />
                <LeadField label="Assigned installer" value={lead.assignedInstaller || 'Unassigned'} />
              </div>
            </div>
          </LeadCard>

          <div className="lead-crm-two-column">
            <LeadCard eyebrow="Contact details" title="Applicant">
              <div className="lead-crm-field-grid">
                <LeadField label="Email" value={<a href={`mailto:${lead.email}`} className="lead-crm-link">{lead.email}</a>} />
                <LeadField label="Phone" value={lead.phone ? <a href={`tel:${lead.phone}`} className="lead-crm-link">{lead.phone}</a> : 'No phone provided'} />
                <LeadField label="Preferred callback" value={callbackWindow} />
                <LeadField label="Address" value={addressSummary} />
                <LeadField label="MPRN" value={lead.mprn} />
                <LeadField label="Consent" value={consentCaptured ? 'Captured' : 'Check required'} />
              </div>
            </LeadCard>

            <LeadCard eyebrow="Property details" title="Home and roof">
              <div className="lead-crm-field-grid">
                <LeadField label="Dwelling type" value={formatEnumValue(lead.dwellingType)} />
                <LeadField label="Year built" value={lead.yearBuilt} />
                <LeadField label="Year occupied" value={lead.yearOccupied || 'Unknown'} />
                <LeadField label="Roof type" value={roofType} />
                <LeadField label="Roof direction" value={roofDirection} />
                <LeadField label="Shading" value={shadingLevel} />
              </div>
            </LeadCard>
          </div>

          <div className="lead-crm-two-column">
            <LeadCard eyebrow="Grant / eligibility" title="SEAI readiness">
              <div className="lead-crm-field-grid">
                <LeadField label="Grant eligibility" value={eligibilityLabel} />
                <LeadField label="Confidence" value={confidenceLabel} />
                <LeadField label="Property owner" value={formatBoolean(lead.propertyOwner)} />
                <LeadField label="Private landlord" value={formatBoolean(lead.privateLandlord)} />
                <LeadField label="Works started" value={formatBoolean(lead.worksStarted)} />
                <LeadField label="Prior grant at MPRN" value={formatBoolean(lead.priorSolarGrantAtMprn)} />
              </div>
              <div className="lead-crm-list-pair">
                <div>
                  <h3>Missing items</h3>
                  <ul className="plain-list">
                    {missingItems.length ? missingItems.map((item) => <li key={item}>{item}</li>) : <li>No missing items recorded.</li>}
                  </ul>
                </div>
                <div>
                  <h3>Risks</h3>
                  <ul className="plain-list">
                    {risks.length ? risks.map((risk) => <li key={risk}>{risk}</li>) : <li>No flagged risks.</li>}
                  </ul>
                </div>
              </div>
            </LeadCard>

            <LeadCard
              eyebrow="Quote estimate"
              title="Commercial estimate"
              actions={<CopyTextButton text={copyQuoteSummary} label="Copy quote estimate" />}
            >
              <div className="lead-crm-field-grid">
                <LeadField label="Gross cost" value={grossQuoteRange} />
                <LeadField label="Grant deduction" value={formatGrantEstimate(quoteEstimate?.estimatedSeaiGrantDeduction)} />
                <LeadField label="Net cost after grant" value={netQuoteRange} />
                <LeadField label="Annual savings" value={annualSavingsRange} />
                <LeadField label="Payback range" value={paybackRange} />
                <LeadField label="Grant status" value={getStringValue(quoteEstimate?.grantStatus, grantLikely ? 'Likely eligible, subject to SEAI approval.' : 'Manual review needed')} />
              </div>
            </LeadCard>
          </div>

          <LeadCard
            eyebrow="Generated customer quote"
            title="Installer-priced quote"
            actions={<Link href="/admin/dashboard/quote-pricing" className="lead-crm-button">Edit Quote Pricing Settings</Link>}
          >
            {generatedQuote ? (
              <div className="lead-crm-field-grid lead-crm-field-grid-wide">
                <LeadField label="Final quote total" value={formatPricingCurrency(generatedQuote.finalQuoteTotal)} />
                <LeadField label="Quote source" value="Quote Pricing settings" />
                <LeadField label="System size" value={formatKwp(generatedQuote.selectedSystemSizeKwp)} />
                <LeadField label="Panel count" value={formatNumber(generatedQuote.estimatedPanelCount)} />
                <LeadField label="Equipment total" value={formatPricingCurrency(generatedQuote.equipmentTotal)} />
                <LeadField label="Labour total" value={formatPricingCurrency(generatedQuote.labourTotal)} />
                <LeadField label="Subtotal" value={formatPricingCurrency(generatedQuote.subtotal)} />
                <LeadField label="Markup" value={formatPricingCurrency(generatedQuote.markupAmount)} />
                <LeadField label="VAT" value={formatPricingCurrency(generatedQuote.vatAmount)} />
                <LeadField label="Discount" value={formatPricingCurrency(generatedQuote.discountAmount)} />
                <LeadField label="Generated at" value={formatDateTime(generatedQuote.generatedAt)} />
                <LeadField label="Pricing version" value={formatDateTime(generatedQuote.pricingUpdatedAt)} />
              </div>
            ) : (
              <div className="empty-state">
                <h3>No installer-priced quote stored yet</h3>
                <p className="small">
                  New homeowner applications automatically generate a quote using your Quote Pricing settings.
                  Existing AI and SEAI estimates remain available above.
                </p>
              </div>
            )}
          </LeadCard>

          <LeadCard eyebrow="Recommended system" title="System sizing and sales signal">
            <div className="lead-crm-field-grid lead-crm-field-grid-wide">
              <LeadField label="Recommended size" value={recommendedSystemSize} />
              <LeadField label="Selected size" value={formatKwp(quoteEstimate?.selectedSystemSizeKwp)} />
              <LeadField label="Estimated panels" value={formatNumber(quoteEstimate?.estimatedPanelCount)} />
              <LeadField label="Selected variant" value={formatEnumValue(quoteEstimate?.selectedVariant)} />
              <LeadField label="Monthly bill range" value={monthlyBillRange} />
              <LeadField label="Daytime usage" value={formatEnumValue(salesSignal?.daytimeUsage)} />
              <LeadField label="Battery interest" value={formatBoolean(salesSignal?.batteryInterest ?? salesSignal?.wantsBattery)} />
              <LeadField label="EV charger interest" value={formatBoolean(salesSignal?.evChargerInterest)} />
              <LeadField label="Hot water diverter" value={formatBoolean(salesSignal?.hotWaterDiverterInterest)} />
              <LeadField label="Recommended extras" value={Array.isArray(quoteEstimate?.recommendedExtras) && quoteEstimate.recommendedExtras.length ? quoteEstimate.recommendedExtras.join(', ') : 'Survey first'} />
            </div>
          </LeadCard>

          <LeadCard eyebrow="Documents" title="Customer document checklist">
            <div className="lead-document-checklist">
              {documentChecklist.map((item) => {
                const document = item.latestDocument;
                const fields = document ? asRecord(document.aiFieldsJson) : null;

                return (
                  <article key={item.type} className={`lead-document-checklist-item ${document ? '' : 'lead-document-checklist-missing'}`.trim()}>
                    <div className="lead-document-checklist-head">
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </div>
                      <span className={`status-pill status-pill-${document ? getDocumentStatusTone(document.status) : 'default'}`}>
                        {document ? getDocumentStatusLabel(document.status) : item.required ? 'Missing' : 'Optional'}
                      </span>
                    </div>

                    {document ? (
                      <>
                        <div className="lead-document-meta-grid">
                          <div>
                            <span>Latest file</span>
                            <strong>{document.originalFilename || document.fileName}</strong>
                          </div>
                          <div>
                            <span>Uploaded</span>
                            <strong>{formatDateTime(document.createdAt)}</strong>
                          </div>
                          <div>
                            <span>Source</span>
                            <strong>{getUploadedByLabel(document.uploadedByRole)}</strong>
                          </div>
                          <div>
                            <span>File</span>
                            <strong>{formatDocumentSize(document.sizeBytes)}</strong>
                          </div>
                        </div>

                        <div className="lead-document-actions">
                          <a href={`/portal/${portalToken}/documents/${document.id}`} target="_blank" rel="noreferrer" className="lead-crm-button">
                            Download
                          </a>
                          <form action={updateLeadDocumentStatus} className="lead-document-review-actions">
                            <input type="hidden" name="leadId" value={lead.id} />
                            <input type="hidden" name="documentId" value={document.id} />
                            <button type="submit" name="status" value="APPROVED" className="secondary">Approve</button>
                            <button type="submit" name="status" value="NEEDS_REPLACEMENT" className="secondary">Needs replacement</button>
                            <button type="submit" name="status" value="REJECTED" className="secondary lead-crm-danger-action">Reject</button>
                          </form>
                        </div>

                        {item.documents.length > 1 ? (
                          <p className="small">{item.documents.length} uploads recorded for this document type.</p>
                        ) : null}

                        {fields ? (
                          <div className="field-chips">
                            {Object.entries(fields).map(([key, value]) => (
                              <span key={key} className="field-chip">{key}: {String(value)}</span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="small">Waiting for the customer or installer to upload this document.</p>
                    )}
                  </article>
                );
              })}
            </div>
          </LeadCard>

          <LeadCard eyebrow="Installer notes" title="Homeowner context">
            <div className="lead-crm-note-layout">
              <div className="homeowner-context-summary">
                <div className="homeowner-context-hero">
                  <span className={`status-pill status-pill-${getLeadTempTone(leadTemperature)}`}>{leadTemperature} lead</span>
                  <span className={`status-pill status-pill-${grantLikely ? 'success' : 'warning'}`}>
                    {grantLikely ? 'Grant likely' : 'Grant review'}
                  </span>
                  <span className="status-pill status-pill-default">{installTimeline}</span>
                </div>
                <div className="homeowner-context-grid">
                  <div><span>Roof Type</span><strong>{roofType}</strong></div>
                  <div><span>Bill Range</span><strong>{monthlyBillRange}</strong></div>
                  <div><span>Battery Interest</span><strong>{formatBoolean(salesSignal?.batteryInterest ?? salesSignal?.wantsBattery)}</strong></div>
                  <div><span>Quote Estimate</span><strong>{netQuoteRange}</strong></div>
                  <div><span>Annual Savings</span><strong>{annualSavingsRange}</strong></div>
                  <div><span>Payback</span><strong>{paybackRange}</strong></div>
                </div>
                <div className="homeowner-context-block">
                  <h3>Recommended next action</h3>
                  <p>{nextRecommendedAction}</p>
                </div>
              </div>

              <div className="lead-crm-notes-panel">
                <h3>Captured homeowner notes</h3>
                {getNoteValue(noteEntries, 'Homeowner notes') ? <p>{getNoteValue(noteEntries, 'Homeowner notes')}</p> : <p className="small">No free-text homeowner note recorded.</p>}
                {noteEntries.length ? (
                  <div className="context-note-list">
                    {noteEntries
                      .filter((entry) => entry.label.toLowerCase() !== 'homeowner notes')
                      .map((entry) => (
                        <div key={`${entry.label}-${entry.value}`}>
                          <span>{entry.label}</span>
                          <strong>{formatNoteValue(entry.label, entry.value)}</strong>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>
          </LeadCard>

          <LeadCard eyebrow="CRM timeline" title="Activity feed">
            <div className="lead-activity-timeline">
              {activities.length ? activities.map((activity) => (
                <article key={activity.id} className="lead-activity-item">
                  <div className={`lead-activity-icon lead-activity-icon-${getActivityTone(activity.type)}`} aria-hidden="true">
                    {getActivityTypeLabel(activity.type).slice(0, 1)}
                  </div>
                  <div className="lead-activity-body">
                    <div className="lead-activity-header">
                      <div>
                        <strong>{activity.title}</strong>
                        <span className={`status-pill status-pill-${getActivityTone(activity.type)}`}>
                          {getActivityTypeLabel(activity.type)}
                        </span>
                      </div>
                      <time dateTime={activity.createdAt.toISOString()}>{formatDateTime(activity.createdAt)}</time>
                    </div>
                    {activity.description ? <p>{activity.description}</p> : null}
                    {activity.createdBy ? (
                      <div className="small">
                        {activity.createdByRole ? `${activity.createdByRole.toLowerCase()} / ` : ''}
                        {activity.createdBy}
                      </div>
                    ) : null}
                  </div>
                </article>
              )) : (
                <div className="empty-state">
                  <h3>No CRM activity yet</h3>
                  <p className="small">Stage changes, internal notes, follow-ups, emails, SMS, documents, and proposal events will appear here.</p>
                </div>
              )}
            </div>
          </LeadCard>

          <LeadCard eyebrow="Internal notes" title="Add a private note">
            <form action={addLeadNote} className="lead-note-form">
              <input type="hidden" name="leadId" value={lead.id} />
              <label htmlFor="lead-note">Note</label>
              <textarea id="lead-note" name="note" rows={4} placeholder="Add a private note for the installer/admin team. Homeowners cannot see this." />
              <div className="lead-crm-action-buttons">
                <button type="submit">Add Note</button>
              </div>
            </form>
          </LeadCard>

          <LeadCard eyebrow="Exports" title="Application pack and structured data">
            <div className="action-grid export-action-grid">
              <Link className="action-card export-action-card" href={`/admin/dashboard/leads/${lead.id}/application-pack`}>
                <h3>Application Pack</h3>
                <p className="small">Open the copy-friendly manual SEAI submission prep view.</p>
              </Link>
              <a className="action-card export-action-card export-action-card-primary" href={`/admin/dashboard/leads/${lead.id}/application-pack/print`} target="_blank" rel="noreferrer">
                <h3>Print summary</h3>
                <p className="small">Open the PDF-friendly manual prep summary.</p>
              </a>
              <a className="action-card export-action-card" href={`/api/submission-package?id=${lead.id}`} target="_blank" rel="noreferrer">
                <h3>Application pack JSON</h3>
                <p className="small">Export structured data for human admin review.</p>
              </a>
              <a className="action-card export-action-card" href={`/api/portal-fill-preview?id=${lead.id}`} target="_blank" rel="noreferrer">
                <h3>Portal fill preview</h3>
                <p className="small">Generate a safe reference payload for manual portal entry.</p>
              </a>
            </div>

            <div className="structured-snapshot">
              <div className="structured-snapshot-header">
                <div>
                  <div className="eyebrow">Structured export snapshot</div>
                  <h3>Operational summary</h3>
                  <p className="small">Readable export view for installer review. Raw payload is hidden below for debugging.</p>
                </div>
                <div className="structured-copy-actions">
                  <CopyTextButton text={copyQuoteSummary} label="Copy quote estimate" />
                  <CopyTextButton text={copyHomeownerSummary} label="Copy homeowner summary" />
                </div>
              </div>

              <div className="structured-highlight-grid">
                <DetailMetric label="Recommended system" value={recommendedSystemSize} tone="success" />
                <DetailMetric label="Estimated panels" value={formatNumber(quoteEstimate?.estimatedPanelCount)} tone="info" />
                <DetailMetric label="Net quote range" value={netQuoteRange} tone="success" />
                <DetailMetric label="Grant eligibility" value={grantLikely ? 'Likely eligible' : 'Review needed'} tone={grantLikely ? 'success' : 'warning'} />
              </div>

              <div className="structured-section-grid">
                <StructuredSection title="Property Information">
                  <StructuredField label="County" value={lead.county} />
                  <StructuredField label="Eircode" value={lead.eircode || 'Not supplied'} />
                  <StructuredField label="MPRN" value={lead.mprn} />
                  <StructuredField label="Dwelling Type" value={formatEnumValue(lead.dwellingType)} />
                  <StructuredField label="Year Built" value={String(lead.yearBuilt)} />
                  <StructuredField label="Year Occupied" value={lead.yearOccupied ? String(lead.yearOccupied) : 'Not supplied'} />
                </StructuredSection>
                <StructuredSection title="Roof Details">
                  <StructuredField label="Roof Type" value={roofType} />
                  <StructuredField label="Roof Direction" value={roofDirection} />
                  <StructuredField label="Shading" value={shadingLevel} />
                </StructuredSection>
                <StructuredSection title="Electricity Usage">
                  <StructuredField label="Monthly Bill Range" value={monthlyBillRange} />
                  <StructuredField label="Daytime Usage" value={formatEnumValue(salesSignal?.daytimeUsage)} />
                  <StructuredField label="Occupants" value={typeof salesSignal?.numberOfOccupants === 'number' ? String(salesSignal.numberOfOccupants) : 'Not supplied'} />
                  <StructuredField label="Battery Interest" value={formatBoolean(salesSignal?.batteryInterest ?? salesSignal?.wantsBattery)} />
                  <StructuredField label="EV Charger Interest" value={formatBoolean(salesSignal?.evChargerInterest)} />
                  <StructuredField label="Hot Water Diverter" value={formatBoolean(salesSignal?.hotWaterDiverterInterest)} />
                </StructuredSection>
                <StructuredSection title="Recommended System">
                  <StructuredField label="Recommended Size" value={recommendedSystemSize} />
                  <StructuredField label="Selected Size" value={formatKwp(quoteEstimate?.selectedSystemSizeKwp)} />
                  <StructuredField label="Estimated Panels" value={formatNumber(quoteEstimate?.estimatedPanelCount)} />
                  <StructuredField label="Selected Variant" value={formatEnumValue(quoteEstimate?.selectedVariant)} />
                  <StructuredField label="Recommended Extras" value={Array.isArray(quoteEstimate?.recommendedExtras) && quoteEstimate.recommendedExtras.length ? quoteEstimate.recommendedExtras.join(', ') : 'Survey first'} />
                </StructuredSection>
                <StructuredSection title="Quote Estimate">
                  <StructuredField label="Gross Cost" value={grossQuoteRange} />
                  <StructuredField label="Grant Deduction" value={formatEuroValue(quoteEstimate?.estimatedSeaiGrantDeduction)} />
                  <StructuredField label="Potential SEAI Grant" value={formatEuroValue(quoteEstimate?.potentialSeaiGrant)} />
                  <StructuredField label="Net Cost After Grant" value={netQuoteRange} />
                </StructuredSection>
                <StructuredSection title="Savings & Payback">
                  <StructuredField label="Annual Generation" value={formatKwhRangeValue(quoteEstimate?.estimatedAnnualGenerationKwh)} />
                  <StructuredField label="Annual Savings" value={annualSavingsRange} />
                  <StructuredField label="Payback Range" value={paybackRange} />
                  <StructuredField label="Self-consumption" value={formatPercent(quoteEstimate?.selfConsumptionRate)} />
                </StructuredSection>
                <StructuredSection title="Grant Status">
                  <StructuredField label="Grant Likely" value={formatBoolean(grantLikely)} />
                  <StructuredField label="AI Eligibility" value={eligibilityLabel} />
                  <StructuredField label="Confidence" value={confidenceLabel} />
                  <StructuredField label="Works Started" value={formatBoolean(lead.worksStarted)} />
                  <StructuredField label="Prior Grant At MPRN" value={formatBoolean(lead.priorSolarGrantAtMprn)} />
                </StructuredSection>
                <StructuredSection title="Installer Notes">
                  <StructuredField label="Lead Temperature" value={leadTemperature} />
                  <StructuredField label="Install Timeline" value={installTimeline} />
                  <StructuredField label="Callback Window" value={callbackWindow} />
                  <StructuredField label="Recommended Next Action" value={nextRecommendedAction} />
                </StructuredSection>
              </div>

              <details className="raw-export-accordion">
                <summary>View raw data</summary>
                <pre className="code-block raw-export-code">{rawExportJson}</pre>
              </details>
            </div>
          </LeadCard>

          <LeadCard eyebrow="Audit log" title="Recent actions">
            <div className="audit-list lead-crm-audit-list">
              {auditLogs.length ? auditLogs.map((entry) => (
                <div key={entry.id} className="audit-item">
                  <div>
                    <strong>{entry.action}</strong>
                    <div className="small">{formatDateTime(entry.createdAt)} by {entry.actor}</div>
                  </div>
                  <details className="raw-export-accordion lead-crm-audit-metadata">
                    <summary>View audit metadata</summary>
                    <pre className="code-block raw-export-code">{JSON.stringify(entry.metadataJson ?? {}, null, 2)}</pre>
                  </details>
                </div>
              )) : (
                <div className="empty-state">
                  <h3>No audit events yet</h3>
                  <p className="small">New workflow updates and erasure actions will appear here.</p>
                </div>
              )}
            </div>
          </LeadCard>
        </div>

        <aside className="lead-crm-sidebar">
          <LeadCard eyebrow="CRM pipeline" title="Sales stage" className="lead-crm-sticky-card">
            <div className="lead-crm-current-stage">
              <span>Current stage</span>
              <strong>{getPipelineStageLabel(lead.pipelineStage)}</strong>
              <small>Last activity {lastActivityLabel}</small>
            </div>

            <form action={updateLeadPipelineStage} className="lead-crm-form">
              <input type="hidden" name="leadId" value={lead.id} />
              <div>
                <label>Pipeline stage</label>
                <select name="pipelineStage" defaultValue={lead.pipelineStage}>
                  {leadPipelineStages.map((stage) => (
                    <option key={stage} value={stage}>{getPipelineStageLabel(stage)}</option>
                  ))}
                </select>
              </div>
              <div className="lead-crm-action-buttons">
                <button type="submit">Update stage</button>
              </div>
            </form>

            <form action={updateLeadPipelineStage} className="lead-crm-quick-stage-form">
              <input type="hidden" name="leadId" value={lead.id} />
              {quickStageActions.map((action) => (
                <button
                  key={action.stage}
                  type="submit"
                  name="pipelineStage"
                  value={action.stage}
                  className={action.stage === 'LOST' ? 'secondary lead-crm-danger-action' : 'secondary'}
                >
                  {action.label}
                </button>
              ))}
            </form>

            <form action={setLeadFollowUp} className="lead-crm-form lead-follow-up-form">
              <input type="hidden" name="leadId" value={lead.id} />
              <div>
                <label>Next follow-up</label>
                <input name="nextFollowUpAt" type="date" defaultValue={formatDateInput(nextFollowUpDate)} />
              </div>
              <div className="lead-crm-action-buttons">
                <button type="submit" className="secondary">Save follow-up</button>
              </div>
            </form>
          </LeadCard>

          <LeadCard eyebrow="Customer portal" title="Secure portal link">
            <p className="small">
              Share this link with the homeowner so they can track project status and upload required documents.
            </p>
            <div className="lead-portal-link-box">
              <span>Portal URL</span>
              <code>{portalUrl}</code>
            </div>
            <div className="lead-crm-action-buttons">
              <CopyTextButton text={portalUrl} label="Copy portal link" />
              <a href={`/portal/${portalToken}`} target="_blank" rel="noreferrer" className="lead-crm-button">
                Open portal
              </a>
            </div>
            <div className="lead-crm-field-grid">
              <LeadField label="Token created" value={formatDateTime(portalAccess.portalTokenCreatedAt)} />
              <LeadField label="Last accessed" value={formatDateTime(portalAccess.portalLastAccessedAt)} />
            </div>
            <form action={regenerateLeadPortalTokenAction} className="lead-crm-form">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="lead-crm-action-buttons">
                <button type="submit" className="secondary">Regenerate portal link</button>
              </div>
            </form>
          </LeadCard>

          <LeadCard eyebrow="Grant/admin workflow" title="Review controls">
            <form action={updateLeadWorkflow} className="admin-workflow-form lead-crm-form">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="lead-crm-form-grid">
                <div>
                  <label>Status</label>
                  <select name="status" defaultValue={lead.status}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Follow-up date</label>
                  <input name="followUpDate" type="date" defaultValue={formatDateInput(lead.followUpDate)} />
                </div>
                <div>
                  <label>Assigned admin</label>
                  <input name="assignedAdmin" defaultValue={lead.assignedAdmin || ''} placeholder="Admin name" />
                </div>
                <div>
                  <label>Assigned installer</label>
                  <input name="assignedInstaller" defaultValue={lead.assignedInstaller || ''} placeholder="Installer or crew" />
                </div>
              </div>

              <div>
                <label>Internal notes</label>
                <textarea name="internalNotes" defaultValue={lead.internalNotes || ''} rows={5} placeholder="Private admin notes for manual SEAI submission prep" />
              </div>

              <div className="workflow-subsection lead-crm-form-subsection">
                <h3>Installer outreach</h3>
                <div className="lead-crm-form-grid">
                  <div>
                    <label>Lead source</label>
                    <input name="leadSource" defaultValue={lead.leadSource || ''} placeholder="Website, referral, call list" />
                  </div>
                  <div>
                    <label>Installer size</label>
                    <input name="installerSize" defaultValue={lead.installerSize || ''} placeholder="Solo, small team, multi-crew" />
                  </div>
                  <div>
                    <label>Likelihood to buy</label>
                    <select name="likelihoodToBuy" defaultValue={lead.likelihoodToBuy || ''}>
                      <option value="">Not scored</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>Current CRM / form process</label>
                  <textarea name="currentCrmProcess" defaultValue={lead.currentCrmProcess || ''} rows={3} placeholder="How they capture and track grant leads today" />
                </div>
                <div>
                  <label>Pain points</label>
                  <textarea name="painPoints" defaultValue={lead.painPoints || ''} rows={3} placeholder="Grant admin, follow-up, missing documents" />
                </div>
                <div>
                  <label>Objections</label>
                  <textarea name="objections" defaultValue={lead.objections || ''} rows={3} placeholder="CRM, data safety, support, price" />
                </div>
                <div className="toggle-grid">
                  <label className="toggle-card">
                    <input name="researchCallCompleted" type="checkbox" defaultChecked={lead.researchCallCompleted} />
                    Research call completed
                  </label>
                  <label className="toggle-card">
                    <input name="salesCallRequired" type="checkbox" defaultChecked={lead.salesCallRequired} />
                    Sales call required
                  </label>
                </div>
              </div>

              <div className="lead-crm-action-buttons">
                <button type="submit" name="workflowAction" value="save">Save review</button>
                <button type="submit" name="workflowAction" value="mark-contacted" className="secondary">Mark as contacted</button>
                <button type="submit" name="workflowAction" value="mark-quoted" className="secondary">Mark as quoted</button>
                <button type="submit" name="workflowAction" value="mark-won" className="secondary">Mark as won</button>
                <button type="submit" name="workflowAction" value="mark-lost" className="secondary">Mark as lost</button>
                <button type="submit" name="workflowAction" value="mark-needs-review" className="secondary">Needs review</button>
              </div>
            </form>
          </LeadCard>

          <LeadCard eyebrow="Warnings / flags" title="Review blockers">
            <div className="structured-chip-list">
              {allWarnings.length ? (
                allWarnings.map((warning) => (
                  <span key={warning} className="structured-chip structured-chip-warning">{warning}</span>
                ))
              ) : (
                <span className="structured-chip structured-chip-success">No warnings recorded</span>
              )}
            </div>
          </LeadCard>

          <LeadCard eyebrow="Sales research" title="Outreach context">
            <div className="lead-crm-field-grid">
              <LeadField label="Source" value={lead.leadSource || 'Not recorded'} />
              <LeadField label="Installer size" value={lead.installerSize || 'Not recorded'} />
              <LeadField label="Likelihood" value={lead.likelihoodToBuy || 'Not scored'} />
              <LeadField label="Research call" value={lead.researchCallCompleted ? 'Completed' : 'Open'} />
              <LeadField label="Sales call" value={lead.salesCallRequired ? 'Required' : 'Not flagged'} />
            </div>
          </LeadCard>

          <LeadCard eyebrow="Data protection" title="Erase homeowner record" className="erasure-card">
            <p className="small">
              Use only for a confirmed deletion request. This deletes the lead and uploaded document rows, then records a minimal audit event.
            </p>
            <form action={eraseLeadData} className="admin-workflow-form lead-crm-form">
              <input type="hidden" name="leadId" value={lead.id} />
              <div>
                <label>Type ERASE to confirm</label>
                <input name="eraseConfirmation" placeholder="ERASE" />
              </div>
              <div className="admin-workflow-actions">
                <button type="submit" className="danger-button">Erase lead data</button>
              </div>
            </form>
          </LeadCard>
        </aside>
      </div>
    </main>
  );
}
