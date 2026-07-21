import type { LeadFormInput, EligibilityAnalysis, LeadTemperature } from './types';
import { inferQuoteLeadTemperature } from './quote-estimate';
import { requireSupportedSolarGrantJurisdiction } from './solargrant-jurisdiction';

function inferLeadTemperature(input: LeadFormInput, likelyEligible: boolean): LeadTemperature {
  return inferQuoteLeadTemperature(input, likelyEligible);
}

export function runRulesBasedEligibility(input: LeadFormInput): EligibilityAnalysis {
  requireSupportedSolarGrantJurisdiction(input);
  const missingItems: string[] = [];
  const risks: string[] = [];

  if (!input.propertyOwner && !input.privateLandlord) {
    risks.push('Applicant does not appear to be an eligible property owner type.');
  }

  if (input.yearBuilt > 2020 || (input.yearOccupied && input.yearOccupied > 2020)) {
    risks.push('Home appears to be built or occupied after 2020.');
  }

  if (input.worksStarted) {
    risks.push('Works may already have started. Grant approval must generally be in place before works begin.');
  }

  if (input.priorSolarGrantAtMprn) {
    risks.push('This MPRN may already have received solar PV funding.');
  }

  if (!/^\d{11}$/.test(input.mprn)) {
    risks.push('MPRN format appears invalid.');
  }

  if (!input.roofType) missingItems.push('Roof type');
  if (!input.monthlyElectricityBillRange) missingItems.push('Monthly electricity bill range');
  if (!input.installTimeline) missingItems.push('Installation timeframe');
  if (!input.preferredCallbackWindow) missingItems.push('Preferred callback time');
  const documentKinds = new Set((input.applicantDocuments || []).map((document) => document.kind));
  if (!documentKinds.has('electricity_bill') && !documentKinds.has('meter_photo')) missingItems.push('Electricity bill or meter photo');
  missingItems.push('Installer SEAI registration confirmation');

  const likelyEligible = risks.length === 0;
  const confidence = likelyEligible ? 0.9 : 0.45;
  const leadTemperature = inferLeadTemperature(input, likelyEligible);

  return {
    likelyEligible,
    confidence,
    missingItems,
    risks,
    leadTemperature,
    summary: likelyEligible
      ? 'Good news: this homeowner looks suitable for the SEAI solar electricity grant, subject to document verification and installer review.'
      : 'This lead needs manual review because one or more grant risk conditions were detected.',
    nextStep: likelyEligible
      ? 'Book a callback, verify the bill and MPRN, and prepare the installer quote plus submission package.'
      : 'Escalate to the installer/admin team to fix the flagged issues before moving ahead.'
  };
}
