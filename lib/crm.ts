import type { LeadActivityType, LeadPipelineStage, LeadScore } from '@prisma/client';
import { classifySolarGrantJurisdiction } from './solargrant-jurisdiction';

export const leadPipelineStages = [
  'NEW_LEAD',
  'CONTACTED',
  'QUALIFIED',
  'SURVEY_BOOKED',
  'SURVEY_COMPLETED',
  'QUOTE_SENT',
  'WON',
  'LOST'
] as const;

export const leadScores = ['HOT', 'WARM', 'COLD'] as const;

export type LeadPipelineStageValue = (typeof leadPipelineStages)[number];
export type LeadScoreValue = (typeof leadScores)[number];

type StageMeta = {
  label: string;
  shortLabel: string;
  icon: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'default';
};

const pipelineStageMeta: Record<LeadPipelineStageValue, StageMeta> = {
  NEW_LEAD: { label: 'New Lead', shortLabel: 'New', icon: 'N', tone: 'info' },
  CONTACTED: { label: 'Contacted', shortLabel: 'Contacted', icon: 'C', tone: 'default' },
  QUALIFIED: { label: 'Qualified', shortLabel: 'Qualified', icon: 'Q', tone: 'success' },
  SURVEY_BOOKED: { label: 'Survey Booked', shortLabel: 'Booked', icon: 'SB', tone: 'warning' },
  SURVEY_COMPLETED: { label: 'Survey Completed', shortLabel: 'Surveyed', icon: 'SC', tone: 'success' },
  QUOTE_SENT: { label: 'Quote Sent', shortLabel: 'Quoted', icon: 'QS', tone: 'info' },
  WON: { label: 'Won', shortLabel: 'Won', icon: 'W', tone: 'success' },
  LOST: { label: 'Lost', shortLabel: 'Lost', icon: 'L', tone: 'danger' }
};

const leadScoreMeta: Record<LeadScoreValue, { label: string; plainLabel: string; tone: 'success' | 'warning' | 'default' }> = {
  HOT: { label: 'Hot', plainLabel: 'Hot', tone: 'success' },
  WARM: { label: 'Warm', plainLabel: 'Warm', tone: 'warning' },
  COLD: { label: 'Cold', plainLabel: 'Cold', tone: 'default' }
};

const activityTypeLabels: Record<string, string> = {
  LEAD_CREATED: 'Lead created',
  STAGE_CHANGED: 'Stage changed',
  SCORE_UPDATED: 'Score updated',
  NOTE_ADDED: 'Note added',
  EMAIL_SENT: 'Email sent',
  SMS_SENT: 'SMS sent',
  DOCUMENT_UPLOADED: 'Document uploaded',
  DOCUMENT_APPROVED: 'Document approved',
  DOCUMENT_REJECTED: 'Document rejected',
  DOCUMENT_NEEDS_REPLACEMENT: 'Replacement needed',
  PORTAL_TOKEN_CREATED: 'Portal link created',
  PORTAL_TOKEN_REGENERATED: 'Portal link regenerated',
  PORTAL_ACCESSED: 'Portal accessed',
  PROPOSAL_VIEWED: 'Proposal viewed',
  QUOTE_SENT: 'Quote sent',
  FOLLOW_UP_SET: 'Follow-up set',
  SYSTEM_EVENT: 'System event'
};

type LeadScoreSource = {
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  county?: string | null;
  eircode?: string | null;
  mprn?: string | null;
  propertyOwner?: boolean | null;
  dwellingType?: string | null;
  yearBuilt?: number | null;
  worksStarted?: boolean | null;
  priorSolarGrantAtMprn?: boolean | null;
  consentToContact?: boolean | null;
  likelyEligible?: boolean | null;
  eligibilityConfidence?: number | null;
  notes?: string | null;
  structuredExportJson?: unknown;
  generatedQuoteJson?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  documents?: readonly unknown[];
  applicantDocuments?: readonly unknown[];
  monthlyElectricityBillRange?: string | null;
  installTimeline?: string | null;
  roofType?: string | null;
  roofDirection?: string | null;
  shadingLevel?: string | null;
  daytimeUsage?: string | null;
  wantsBattery?: boolean | null;
  evChargerInterest?: boolean | null;
  hotWaterDiverterInterest?: boolean | null;
  numberOfOccupants?: number | null;
};

export function isLeadPipelineStage(value: string): value is LeadPipelineStage {
  return leadPipelineStages.includes(value as LeadPipelineStageValue);
}

export function isLeadScore(value: string): value is LeadScore {
  return leadScores.includes(value as LeadScoreValue);
}

export function getPipelineStageLabel(stage: string | null | undefined) {
  return pipelineStageMeta[(stage || 'NEW_LEAD') as LeadPipelineStageValue]?.label ?? 'New Lead';
}

export function getPipelineStageShortLabel(stage: string | null | undefined) {
  return pipelineStageMeta[(stage || 'NEW_LEAD') as LeadPipelineStageValue]?.shortLabel ?? 'New';
}

export function getPipelineStageIcon(stage: string | null | undefined) {
  return pipelineStageMeta[(stage || 'NEW_LEAD') as LeadPipelineStageValue]?.icon ?? 'N';
}

export function getPipelineStageTone(stage: string | null | undefined) {
  return pipelineStageMeta[(stage || 'NEW_LEAD') as LeadPipelineStageValue]?.tone ?? 'info';
}

export function getLeadScoreLabel(score: string | null | undefined) {
  return leadScoreMeta[(score || 'WARM') as LeadScoreValue]?.label ?? leadScoreMeta.WARM.label;
}

export function getLeadScorePlainLabel(score: string | null | undefined) {
  return leadScoreMeta[(score || 'WARM') as LeadScoreValue]?.plainLabel ?? leadScoreMeta.WARM.plainLabel;
}

export function getLeadScoreTone(score: string | null | undefined) {
  return leadScoreMeta[(score || 'WARM') as LeadScoreValue]?.tone ?? 'warning';
}

export function getActivityTypeLabel(type: string | null | undefined) {
  return activityTypeLabels[type || ''] ?? 'Activity';
}

export function getActivityTone(type: LeadActivityType | string) {
  if (type === 'LEAD_CREATED' || type === 'STAGE_CHANGED' || type === 'SCORE_UPDATED' || type === 'QUOTE_SENT' || type === 'DOCUMENT_APPROVED') return 'success';
  if (type === 'NOTE_ADDED' || type === 'FOLLOW_UP_SET' || type === 'DOCUMENT_NEEDS_REPLACEMENT') return 'warning';
  if (type === 'DOCUMENT_REJECTED') return 'danger';
  if (
    type === 'EMAIL_SENT' ||
    type === 'SMS_SENT' ||
    type === 'DOCUMENT_UPLOADED' ||
    type === 'PROPOSAL_VIEWED' ||
    type === 'PORTAL_TOKEN_CREATED' ||
    type === 'PORTAL_TOKEN_REGENERATED' ||
    type === 'PORTAL_ACCESSED'
  ) return 'info';
  return 'default';
}

export function isClosedPipelineStage(stage: string | null | undefined) {
  return stage === 'WON' || stage === 'LOST';
}

export function shouldSetLastContactedAt(stage: string | null | undefined) {
  return stage === 'CONTACTED' || stage === 'QUALIFIED' || stage === 'SURVEY_BOOKED' || stage === 'QUOTE_SENT' || stage === 'WON';
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

export function getSalesSignalFromStructuredExport(value: unknown) {
  const root = asRecord(value);
  return asRecord(root?.salesSignal);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }

  return null;
}

function isKnownValue(value: string | null, missingValues = ['UNSURE', 'JUST_RESEARCHING']) {
  return Boolean(value && !missingValues.includes(value));
}

function isRecent(value: Date | string | null | undefined) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() <= fourteenDaysMs;
}

export function calculateLeadScore(input: LeadScoreSource): LeadScore {
  const jurisdiction = classifySolarGrantJurisdiction({ county: input.county, eircode: input.eircode });
  const signal = getSalesSignalFromStructuredExport(input.structuredExportJson);
  const monthlyBill = firstString(input.monthlyElectricityBillRange, signal?.monthlyElectricityBillRange);
  const installTimeline = firstString(input.installTimeline, signal?.installTimeline);
  const roofType = firstString(input.roofType, signal?.roofType);
  const roofDirection = firstString(input.roofDirection, signal?.roofDirection);
  const shadingLevel = firstString(input.shadingLevel, signal?.shadingLevel);
  const daytimeUsage = firstString(input.daytimeUsage, signal?.daytimeUsage);
  const existingTemperature = firstString(signal?.leadTemperature);
  const documentCount = (input.documents?.length ?? 0) + (input.applicantDocuments?.length ?? 0);

  let points = 0;

  if (input.email && input.phone) points += 2;
  else if (input.email || input.phone) points += 1;

  if (jurisdiction.isSupported && input.addressLine1 && input.county && input.mprn) points += 2;
  if (jurisdiction.isSupported && input.eircode) points += 1;
  if (input.dwellingType && input.yearBuilt) points += 1;

  if (input.propertyOwner && !input.worksStarted && !input.priorSolarGrantAtMprn) points += 2;
  if (!input.propertyOwner) points -= 2;
  if (input.worksStarted || input.priorSolarGrantAtMprn) points -= 3;

  if (isKnownValue(roofType)) points += 1;
  if (isKnownValue(roofDirection)) points += 1;
  if (isKnownValue(shadingLevel)) points += 1;

  if (monthlyBill === 'OVER_200' || monthlyBill === 'BETWEEN_150_AND_200') points += 2;
  else if (monthlyBill === 'BETWEEN_100_AND_150') points += 1;

  if (daytimeUsage === 'HIGH' || daytimeUsage === 'MEDIUM') points += 1;
  if (input.wantsBattery || signal?.batteryInterest === true || signal?.wantsBattery === true) points += 1;
  if (input.evChargerInterest || input.hotWaterDiverterInterest) points += 1;
  if (typeof input.numberOfOccupants === 'number' && input.numberOfOccupants > 0) points += 1;

  if (installTimeline === 'ASAP') points += 3;
  else if (installTimeline === 'ONE_TO_THREE_MONTHS') points += 2;
  else if (installTimeline === 'THREE_TO_SIX_MONTHS') points += 1;
  else if (installTimeline === 'JUST_RESEARCHING') points -= 1;

  if (jurisdiction.isSupported && input.likelyEligible === true) points += 2;
  if (jurisdiction.isSupported && input.likelyEligible === false) points -= 3;

  if (jurisdiction.isSupported && typeof input.eligibilityConfidence === 'number') {
    if (input.eligibilityConfidence >= 0.85) points += 1;
    if (input.eligibilityConfidence < 0.55) points -= 1;
  }

  if (documentCount > 0) points += 1;
  if (input.generatedQuoteJson) points += 1;
  if (input.consentToContact) points += 1;
  if (input.notes && input.notes.length > 20) points += 1;
  if (isRecent(input.updatedAt) || isRecent(input.createdAt)) points += 1;

  if (existingTemperature === 'HOT') points += 2;
  if (existingTemperature === 'COLD') points -= 2;

  if (points >= 11) return 'HOT';
  if (points >= 5) return 'WARM';
  return 'COLD';
}
