import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateLeadQualificationAction, getLeadQualificationSummary, type ProgressiveLeadFacts } from '../../lib/lead-qualification';

const unknownLead: ProgressiveLeadFacts = {
  addressLine1: null,
  county: null,
  eircode: null,
  propertyOwner: null,
  privateLandlord: null,
  dwellingType: null,
  yearBuilt: null,
  mprn: null,
  worksStarted: null,
  priorSolarGrantAtMprn: null,
  consentToProcess: null,
  consentToGrantAssist: null,
  consentToContact: null,
  structuredExportJson: null,
  generatedQuoteJson: null,
  likelyEligible: null
};

const completeLead: ProgressiveLeadFacts = {
  addressLine1: '1 Main Street',
  county: 'Dublin',
  eircode: 'D02 X285',
  propertyOwner: true,
  privateLandlord: false,
  dwellingType: 'DETACHED',
  yearBuilt: 2015,
  mprn: '10012345678',
  worksStarted: false,
  priorSolarGrantAtMprn: false,
  consentToProcess: true,
  consentToGrantAssist: true,
  consentToContact: true,
  structuredExportJson: {
    salesSignal: {
      monthlyElectricityBillRange: 'BETWEEN_100_AND_150',
      roofType: 'TILE',
      installTimeline: 'ONE_TO_THREE_MONTHS'
    }
  },
  generatedQuoteJson: { total: 10000 },
  likelyEligible: true
};

test('unknown facts block every qualification-dependent action without becoming negative answers', () => {
  const summary = getLeadQualificationSummary(unknownLead);
  assert.equal(summary.eligibility.allowed, false);
  assert.equal(summary.recommendation.allowed, false);
  assert.equal(summary.readiness.allowed, false);
  assert.equal(summary.consent.allowed, false);
  assert.equal(summary.governedDocuments.allowed, false);
  assert.ok(summary.eligibility.missingFacts.includes('worksStarted'));
});

test('false validated answers count as present while null remains unknown', () => {
  const decision = evaluateLeadQualificationAction({ lead: completeLead, action: 'GRANT_ELIGIBILITY' });
  assert.equal(decision.allowed, true);
  assert.ok(!decision.missingFacts.includes('worksStarted'));
  assert.ok(!decision.missingFacts.includes('privateLandlord'));
});

test('complete facts allow approved gates but governed documents stay blocked without Release 1.4 capability', () => {
  assert.equal(evaluateLeadQualificationAction({ lead: completeLead, action: 'QUOTE_RECOMMENDATION' }).allowed, true);
  assert.equal(evaluateLeadQualificationAction({ lead: completeLead, action: 'GRANT_READINESS' }).allowed, true);
  assert.equal(evaluateLeadQualificationAction({ lead: completeLead, action: 'HOMEOWNER_CONSENT_PROCESSING' }).allowed, true);
  assert.equal(evaluateLeadQualificationAction({ lead: completeLead, action: 'GOVERNED_DOCUMENT_GENERATION' }).allowed, false);
  assert.equal(evaluateLeadQualificationAction({
    lead: completeLead,
    action: 'GOVERNED_DOCUMENT_GENERATION',
    generatedDocumentCapabilityAvailable: true
  }).allowed, true);
});

test('present but invalid facts do not pass an action gate', () => {
  const invalid = {
    ...completeLead,
    county: 'Unknown county',
    mprn: 'not-an-mprn',
    yearBuilt: 0,
    structuredExportJson: { salesSignal: {} }
  };
  const eligibility = evaluateLeadQualificationAction({ lead: invalid, action: 'GRANT_ELIGIBILITY' });
  const recommendation = evaluateLeadQualificationAction({ lead: invalid, action: 'QUOTE_RECOMMENDATION' });
  assert.equal(eligibility.allowed, false);
  assert.ok(eligibility.missingFacts.includes('jurisdiction'));
  assert.ok(eligibility.missingFacts.includes('mprn'));
  assert.ok(eligibility.missingFacts.includes('yearBuilt'));
  assert.ok(recommendation.missingFacts.includes('energyAndUsageInformation'));
});
