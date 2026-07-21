import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySolarGrantJurisdiction,
  isReviewedEircode,
  northernIrelandCounties,
  normalizeSolarGrantCounty,
  normalizeSolarGrantLocationCode,
  republicOfIrelandCounties,
  requireSupportedSolarGrantJurisdiction,
  SolarGrantJurisdictionError
} from '../../lib/solargrant-jurisdiction';
import { adaptSolarGrantLeadForPresentation } from '../../lib/solargrant-jurisdiction-safe-view';
import { aggregateSolarGrantJurisdictionFacts } from '../../lib/solargrant-jurisdiction-audit';
import { buildSolarQuoteEstimate } from '../../lib/quote-estimate';
import { runRulesBasedEligibility } from '../../lib/eligibility';
import type { LeadFormInput } from '../../lib/types';

function leadInput(overrides: Partial<LeadFormInput> = {}): LeadFormInput {
  return {
    installerId: 'installer-test',
    fullName: 'Test Homeowner',
    email: 'homeowner@example.test',
    phone: '+353871234567',
    addressLine1: '1 Test Road',
    county: 'Dublin',
    eircode: 'D01 F5P2',
    propertyOwner: true,
    privateLandlord: false,
    dwellingType: 'DETACHED',
    yearBuilt: 2010,
    roofType: 'SLATE',
    roofDirection: 'SOUTH',
    shadingLevel: 'NONE',
    mprn: '10099998887',
    worksStarted: false,
    priorSolarGrantAtMprn: false,
    monthlyElectricityBillRange: 'OVER_200',
    wantsBattery: false,
    evChargerInterest: false,
    hotWaterDiverterInterest: false,
    daytimeUsage: 'MEDIUM',
    installTimeline: 'ASAP',
    preferredCallbackWindow: 'ANYTIME',
    consentToProcess: true,
    consentToGrantAssist: true,
    consentToContact: true,
    ...overrides
  };
}

test('all 26 Republic of Ireland counties classify as supported', () => {
  assert.equal(republicOfIrelandCounties.length, 26);
  for (const county of republicOfIrelandCounties) {
    const result = classifySolarGrantJurisdiction({ county, eircode: '' });
    assert.equal(result.jurisdiction, 'REPUBLIC_OF_IRELAND', county);
    assert.equal(result.reason, 'SUPPORTED_COUNTY', county);
    assert.equal(result.isSupported, true, county);
  }
});

test('all six Northern Ireland counties classify as unsupported', () => {
  assert.equal(northernIrelandCounties.length, 6);
  for (const county of northernIrelandCounties) {
    const result = classifySolarGrantJurisdiction({ county });
    assert.equal(result.jurisdiction, 'NORTHERN_IRELAND', county);
    assert.equal(result.isSupported, false, county);
  }
});

test('county and location-code normalisation is deterministic', () => {
  assert.equal(normalizeSolarGrantCounty('  dUbLiN  '), 'Dublin');
  assert.equal(normalizeSolarGrantCounty('County Dublin'), null);
  assert.equal(normalizeSolarGrantLocationCode('d01f5p2'), 'D01 F5P2');
  assert.equal(normalizeSolarGrantLocationCode('bt7 1aa'), 'BT7 1AA');
});

test('missing and unknown county remain unknown ordinary input', () => {
  assert.equal(classifySolarGrantJurisdiction({ county: '' }).reason, 'MISSING_COUNTY');
  assert.equal(classifySolarGrantJurisdiction({ county: 'Synthetic County' }).reason, 'UNKNOWN_COUNTY');
});

test('blank optional Eircode and reviewed formats are accepted', () => {
  for (const eircode of ['', 'D01 F5P2', 'D6W F5P2', 'A65F4E2', 'H91 F4E2']) {
    const result = classifySolarGrantJurisdiction({ county: 'Dublin', eircode });
    assert.equal(result.isSupported, true, eircode);
  }
  assert.equal(isReviewedEircode('D01 TEST'), false);
});

test('malformed Eircode, BT signal, and conflicting explicit signals classify safely', () => {
  assert.equal(classifySolarGrantJurisdiction({ county: 'Dublin', eircode: 'bad' }).reason, 'INVALID_EIRCODE');
  assert.equal(classifySolarGrantJurisdiction({ county: 'Antrim', eircode: 'BT7 1AA' }).reason, 'NORTHERN_IRELAND_POSTCODE');
  const conflict = classifySolarGrantJurisdiction({ county: 'Dublin', eircode: 'BT7 1AA' });
  assert.equal(conflict.jurisdiction, 'UNKNOWN');
  assert.equal(conflict.reason, 'CONFLICTING_LOCATION');
});

test('free-text address does not override explicit county and postcode signals', () => {
  assert.equal(classifySolarGrantJurisdiction({ county: 'Dublin', addressLine1: 'Belfast Road' }).isSupported, true);
  assert.equal(classifySolarGrantJurisdiction({ county: 'Antrim', addressLine1: 'Dublin Road' }).jurisdiction, 'NORTHERN_IRELAND');
});

test('eligibility and quote boundaries fail closed before producing SEAI output', () => {
  for (const input of [
    leadInput({ county: 'Antrim' as LeadFormInput['county'], eircode: undefined }),
    leadInput({ county: 'Dublin', eircode: 'BT7 1AA' })
  ]) {
    assert.throws(() => runRulesBasedEligibility(input), SolarGrantJurisdictionError);
    assert.throws(() => buildSolarQuoteEstimate(input), SolarGrantJurisdictionError);
    assert.throws(() => requireSupportedSolarGrantJurisdiction(input), SolarGrantJurisdictionError);
  }
});

test('historical unsafe records retain source location while grant conclusions are suppressed', () => {
  const historical = {
    id: 'lead-ni',
    organisationId: 'org-a',
    county: 'Antrim',
    eircode: 'BT7 1AA',
    likelyEligible: true,
    eligibilityConfidence: 0.98,
    aiSummary: 'Likely eligible for the grant.',
    risksJson: [],
    notes: 'Homeowner notes: keep | Quote estimate: 5 kWp / net 5000-6000',
    structuredExportJson: {
      quoteEstimate: {
        estimatedSeaiGrantDeduction: 1800,
        potentialSeaiGrant: 1800,
        netCostRangeAfterGrant: { min: 5000, max: 6000 },
        grantLikely: true,
        grantStatus: 'Likely'
      },
      salesSignal: { grantLikely: true, estimatedSeaiGrantDeduction: 1800 }
    }
  };
  const safe = adaptSolarGrantLeadForPresentation(historical);
  assert.equal(safe.county, historical.county);
  assert.equal(safe.eircode, historical.eircode);
  assert.equal(safe.organisationId, historical.organisationId);
  assert.equal(safe.likelyEligible, null);
  assert.equal(safe.eligibilityConfidence, null);
  assert.equal(safe.jurisdictionView.status, 'UNSUPPORTED');
  const rendered = JSON.stringify(safe);
  assert.equal(rendered.includes('1800'), false);
  assert.equal(rendered.includes('5000'), false);
  assert.equal(rendered.includes('Likely eligible for the grant'), false);
});

test('unknown historical records show location review and ROI records remain unchanged', () => {
  const unknown = adaptSolarGrantLeadForPresentation({ county: 'Synthetic County', eircode: null, likelyEligible: true });
  assert.equal(unknown.jurisdictionView.status, 'LOCATION_REVIEW');
  assert.equal(unknown.likelyEligible, null);

  const roi = { county: 'Dublin', eircode: 'D01 F5P2', likelyEligible: true, aiSummary: 'Supported snapshot' };
  const supported = adaptSolarGrantLeadForPresentation(roi);
  assert.equal(supported.jurisdictionView.status, 'SUPPORTED');
  assert.equal(supported.likelyEligible, true);
  assert.equal(supported.aiSummary, roi.aiSummary);
});

test('aggregate audit results contain counts only and never raw location values', () => {
  const result = aggregateSolarGrantJurisdictionFacts([
    { organisationId: 'org-a', county: 'Dublin', eircode: 'D01 F5P2' },
    { organisationId: 'org-a', county: 'Antrim', eircode: 'BT7 1AA' },
    { organisationId: 'org-b', county: 'Synthetic County', eircode: null }
  ]);
  assert.equal(result.reduce((sum, row) => sum + row.count, 0), 3);
  const output = JSON.stringify(result);
  assert.equal(output.includes('Dublin'), false);
  assert.equal(output.includes('Antrim'), false);
  assert.equal(output.includes('D01 F5P2'), false);
  assert.equal(output.includes('BT7 1AA'), false);
});
