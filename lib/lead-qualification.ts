import { classifySolarGrantJurisdiction } from './solargrant-jurisdiction';
import { billRanges, dwellingTypes, installTimelines, roofTypes } from './types';

export type QualificationAction =
  | 'GRANT_ELIGIBILITY'
  | 'QUOTE_RECOMMENDATION'
  | 'GRANT_READINESS'
  | 'HOMEOWNER_CONSENT_PROCESSING'
  | 'GOVERNED_DOCUMENT_GENERATION';

export type ProgressiveLeadFacts = {
  addressLine1: string | null;
  county: string | null;
  eircode: string | null;
  propertyOwner: boolean | null;
  privateLandlord: boolean | null;
  dwellingType: string | null;
  yearBuilt: number | null;
  mprn: string | null;
  worksStarted: boolean | null;
  priorSolarGrantAtMprn: boolean | null;
  consentToProcess: boolean | null;
  consentToGrantAssist: boolean | null;
  consentToContact: boolean | null;
  structuredExportJson: unknown | null;
  generatedQuoteJson: unknown | null;
  likelyEligible: boolean | null;
};

export type QualificationDecision = {
  allowed: boolean;
  action: QualificationAction;
  missingFacts: string[];
  reason: string;
};

export class QualificationGateError extends Error {
  readonly code = 'LEAD_QUALIFICATION_INCOMPLETE';

  constructor(readonly decision: QualificationDecision) {
    super(decision.reason);
    this.name = 'QualificationGateError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function getEligibilityFactErrors(lead: ProgressiveLeadFacts) {
  const currentYear = new Date().getUTCFullYear();
  const jurisdiction = classifySolarGrantJurisdiction({
    addressLine1: lead.addressLine1,
    county: lead.county,
    eircode: lead.eircode
  });

  return [
    typeof lead.addressLine1 === 'string' && lead.addressLine1.trim().length >= 5 ? null : 'addressLine1',
    jurisdiction.isSupported ? null : 'jurisdiction',
    typeof lead.propertyOwner === 'boolean' ? null : 'propertyOwner',
    typeof lead.privateLandlord === 'boolean' ? null : 'privateLandlord',
    isOneOf(lead.dwellingType, dwellingTypes) ? null : 'dwellingType',
    Number.isInteger(lead.yearBuilt) && lead.yearBuilt! >= 1800 && lead.yearBuilt! <= currentYear ? null : 'yearBuilt',
    typeof lead.mprn === 'string' && /^\d{11}$/.test(lead.mprn) ? null : 'mprn',
    typeof lead.worksStarted === 'boolean' ? null : 'worksStarted',
    typeof lead.priorSolarGrantAtMprn === 'boolean' ? null : 'priorSolarGrantAtMprn'
  ].filter((value): value is string => value !== null);
}

function hasValidatedRecommendationFacts(value: unknown) {
  if (!isRecord(value) || !isRecord(value.salesSignal)) return false;
  const signal = value.salesSignal;
  return isOneOf(signal.monthlyElectricityBillRange, billRanges)
    && isOneOf(signal.roofType, roofTypes)
    && isOneOf(signal.installTimeline, installTimelines);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function evaluateLeadQualificationAction(args: {
  lead: ProgressiveLeadFacts;
  action: QualificationAction;
  generatedDocumentCapabilityAvailable?: boolean;
}): QualificationDecision {
  const { lead, action, generatedDocumentCapabilityAvailable = false } = args;
  let missingFacts: string[];
  const eligibilityFactErrors = getEligibilityFactErrors(lead);

  switch (action) {
    case 'GRANT_ELIGIBILITY':
      missingFacts = eligibilityFactErrors;
      break;
    case 'QUOTE_RECOMMENDATION':
      missingFacts = [
        ...eligibilityFactErrors,
        ...(!hasValidatedRecommendationFacts(lead.structuredExportJson) ? ['energyAndUsageInformation'] : [])
      ];
      break;
    case 'HOMEOWNER_CONSENT_PROCESSING':
      missingFacts = [
        ...(!lead.consentToProcess ? ['consentToProcess'] : []),
        ...(!lead.consentToGrantAssist ? ['consentToGrantAssist'] : []),
        ...(!lead.consentToContact ? ['consentToContact'] : [])
      ];
      break;
    case 'GRANT_READINESS':
      missingFacts = [
        ...eligibilityFactErrors,
        ...(typeof lead.likelyEligible !== 'boolean' ? ['eligibilityAssessment'] : []),
        ...(!lead.consentToProcess ? ['consentToProcess'] : []),
        ...(!lead.consentToGrantAssist ? ['consentToGrantAssist'] : [])
      ];
      break;
    case 'GOVERNED_DOCUMENT_GENERATION':
      missingFacts = [
        ...eligibilityFactErrors,
        ...(!hasValidatedRecommendationFacts(lead.structuredExportJson) ? ['verifiedStructuredInputs'] : []),
        ...(!lead.consentToProcess ? ['consentToProcess'] : []),
        ...(!lead.consentToGrantAssist ? ['consentToGrantAssist'] : []),
        ...(!generatedDocumentCapabilityAvailable ? ['governedRelease14Capability'] : [])
      ];
      break;
  }

  missingFacts = unique(missingFacts);
  return {
    action,
    allowed: missingFacts.length === 0,
    missingFacts,
    reason: missingFacts.length === 0
      ? 'The validated facts required for this action are available.'
      : 'Qualification is incomplete. Missing or unverified facts must be collected before this action.'
  };
}

export function requireLeadQualificationAction(args: {
  lead: ProgressiveLeadFacts;
  action: QualificationAction;
  generatedDocumentCapabilityAvailable?: boolean;
}) {
  const decision = evaluateLeadQualificationAction(args);
  if (!decision.allowed) throw new QualificationGateError(decision);
  return decision;
}

export function getLeadQualificationSummary(lead: ProgressiveLeadFacts) {
  return {
    eligibility: evaluateLeadQualificationAction({ lead, action: 'GRANT_ELIGIBILITY' }),
    recommendation: evaluateLeadQualificationAction({ lead, action: 'QUOTE_RECOMMENDATION' }),
    readiness: evaluateLeadQualificationAction({ lead, action: 'GRANT_READINESS' }),
    consent: evaluateLeadQualificationAction({ lead, action: 'HOMEOWNER_CONSENT_PROCESSING' }),
    governedDocuments: evaluateLeadQualificationAction({ lead, action: 'GOVERNED_DOCUMENT_GENERATION' })
  };
}
