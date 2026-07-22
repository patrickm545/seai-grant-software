import {
  classifySolarGrantJurisdiction,
  SOLARGRANT_LOCATION_REVIEW_MESSAGE,
  SOLARGRANT_UNSUPPORTED_MESSAGE,
  type SolarGrantJurisdictionResult
} from './solargrant-jurisdiction';
import { calculateLeadScore } from './crm';

type StoredLeadLocation = {
  county?: string | null;
  eircode?: string | null;
  likelyEligible?: boolean | null;
  eligibilityConfidence?: number | null;
  aiSummary?: string | null;
  missingItemsJson?: unknown;
  risksJson?: unknown;
  structuredExportJson?: unknown;
  notes?: string | null;
  status?: string;
  leadScore?: string;
};

export type SolarGrantJurisdictionViewState = {
  classification: SolarGrantJurisdictionResult;
  status: 'SUPPORTED' | 'UNSUPPORTED' | 'LOCATION_REVIEW';
  label: string;
  message: string | null;
  canPresentSeaiConclusions: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asStringArray(value: unknown) {
  if (typeof value === 'string') {
    try {
      return asStringArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getViewState(classification: SolarGrantJurisdictionResult): SolarGrantJurisdictionViewState {
  if (classification.isSupported) {
    return {
      classification,
      status: 'SUPPORTED',
      label: 'Republic of Ireland SEAI route',
      message: null,
      canPresentSeaiConclusions: true
    };
  }

  const unsupported = classification.jurisdiction === 'NORTHERN_IRELAND';
  return {
    classification,
    status: unsupported ? 'UNSUPPORTED' : 'LOCATION_REVIEW',
    label: unsupported ? 'SEAI route not supported for this location' : 'Property location review required',
    message: unsupported ? SOLARGRANT_UNSUPPORTED_MESSAGE : SOLARGRANT_LOCATION_REVIEW_MESSAGE,
    canPresentSeaiConclusions: false
  };
}

function sanitiseStructuredExport(value: unknown, safeMessage: string) {
  const root = asRecord(value);
  if (!root) return value;

  const safeRoot = { ...root };
  const quoteEstimate = asRecord(root.quoteEstimate);
  if (quoteEstimate) {
    const safeQuote = { ...quoteEstimate };
    delete safeQuote.estimatedSeaiGrantDeduction;
    delete safeQuote.potentialSeaiGrant;
    delete safeQuote.netCostRangeAfterGrant;
    delete safeQuote.grantLikely;
    safeQuote.grantStatus = safeMessage;
    safeQuote.recommendedNextAction = safeMessage;
    safeQuote.grantWarnings = [safeMessage];
    safeRoot.quoteEstimate = safeQuote;
  }

  const salesSignal = asRecord(root.salesSignal);
  if (salesSignal) {
    const safeSignal = { ...salesSignal };
    delete safeSignal.estimatedNetCostRangeAfterGrant;
    delete safeSignal.estimatedSeaiGrantDeduction;
    delete safeSignal.grantLikely;
    safeSignal.recommendedNextAction = safeMessage;
    safeRoot.salesSignal = safeSignal;
  }

  return safeRoot;
}

function sanitiseHistoricalNotes(value: string | null | undefined, safeMessage: string) {
  if (!value) return value;
  const retained = value
    .split(' | ')
    .filter((entry) => !/^(Quote estimate|Recommended next action):/i.test(entry.trim()));
  return [...retained, `Location routing: ${safeMessage}`].join(' | ');
}

export function getSolarGrantJurisdictionViewState(lead: StoredLeadLocation) {
  return getViewState(classifySolarGrantJurisdiction({ county: lead.county, eircode: lead.eircode }));
}

export function adaptSolarGrantLeadForPresentation<T extends StoredLeadLocation>(lead: T): T & {
  jurisdictionView: SolarGrantJurisdictionViewState;
} {
  const jurisdictionView = getSolarGrantJurisdictionViewState(lead);
  if (jurisdictionView.canPresentSeaiConclusions) return { ...lead, jurisdictionView };

  const safeMessage = jurisdictionView.message ?? SOLARGRANT_LOCATION_REVIEW_MESSAGE;
  const risks = [...asStringArray(lead.risksJson), safeMessage];
  const safeStructuredExport = sanitiseStructuredExport(lead.structuredExportJson, safeMessage);
  const safeLeadScore = 'leadScore' in lead
    ? calculateLeadScore({
        ...lead,
        likelyEligible: null,
        eligibilityConfidence: null,
        structuredExportJson: safeStructuredExport
      })
    : undefined;
  const safeLead = {
    ...lead,
    likelyEligible: null,
    eligibilityConfidence: null,
    aiSummary: safeMessage,
    risksJson: [...new Set(risks)],
    structuredExportJson: safeStructuredExport,
    notes: sanitiseHistoricalNotes(lead.notes, safeMessage),
    ...('status' in lead ? { status: 'NEEDS_REVIEW' } : {}),
    ...('leadScore' in lead ? { leadScore: safeLeadScore } : {}),
    jurisdictionView
  };
  return safeLead as T & { jurisdictionView: SolarGrantJurisdictionViewState };
}
