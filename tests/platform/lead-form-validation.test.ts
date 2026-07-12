import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_APPLICANT_DOCUMENTS } from '../../lib/lead-form-flow';
import { formatLeadFormValidationFailure, leadFormSchema } from '../../lib/validation';

function buildValidSubmission(overrides: Record<string, unknown> = {}) {
  return {
    installerId: 'demo-installer',
    fullName: 'Codex Valid Lead',
    email: 'codex.valid@example.com',
    phone: '+353871234567',
    addressLine1: '1 Reliability Road',
    addressLine2: '',
    county: 'Dublin',
    eircode: 'D01TEST',
    propertyOwner: true,
    privateLandlord: false,
    dwellingType: 'DETACHED',
    yearBuilt: 2018,
    yearOccupied: 2019,
    roofType: 'SLATE',
    roofDirection: 'SOUTH',
    shadingLevel: 'NONE',
    mprn: '10099998887',
    worksStarted: false,
    priorSolarGrantAtMprn: false,
    monthlyElectricityBillRange: 'OVER_200',
    wantsBattery: true,
    selectedSystemSizeVariant: 'recommended',
    evChargerInterest: false,
    hotWaterDiverterInterest: false,
    numberOfOccupants: 4,
    daytimeUsage: 'MEDIUM',
    installTimeline: 'ASAP',
    preferredCallbackWindow: 'ANYTIME',
    consentToProcess: true,
    consentToGrantAssist: true,
    consentToContact: true,
    notes: 'Please call after lunch.',
    applicantDocuments: [],
    ...overrides
  };
}

function buildDocument(index: number) {
  return {
    kind: 'electricity_bill' as const,
    fileName: `bill-${index}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 1024
  };
}

test('lead form schema accepts the number of documents allowed by the UI', () => {
  const applicantDocuments = Array.from({ length: MAX_APPLICANT_DOCUMENTS }, (_, index) => buildDocument(index));
  const result = leadFormSchema.safeParse(buildValidSubmission({ applicantDocuments }));

  assert.equal(result.success, true);
});

test('lead form schema rejects document counts beyond the UI maximum', () => {
  const applicantDocuments = Array.from({ length: MAX_APPLICANT_DOCUMENTS + 1 }, (_, index) => buildDocument(index));
  const result = leadFormSchema.safeParse(buildValidSubmission({ applicantDocuments }));

  assert.equal(result.success, false);
  if (!result.success) {
    const failure = formatLeadFormValidationFailure(result.error, 'request-test');
    assert.equal(failure.fieldErrors?.applicantDocuments, `Please upload no more than ${MAX_APPLICANT_DOCUMENTS} files.`);
    assert.equal(failure.firstErrorStepId, 'contact');
  }
});

test('lead form validation failure maps the first invalid field to its form step', () => {
  const result = leadFormSchema.safeParse(buildValidSubmission({ mprn: '123' }));

  assert.equal(result.success, false);
  if (!result.success) {
    const failure = formatLeadFormValidationFailure(result.error, 'request-test');
    assert.equal(failure.error, 'Please review the highlighted fields.');
    assert.equal(failure.fieldErrors?.mprn, 'MPRN must be 11 digits.');
    assert.equal(failure.firstErrorField, 'mprn');
    assert.equal(failure.firstErrorStepId, 'property');
    assert.equal(failure.firstErrorStepIndex, 0);
    assert.equal(failure.requestId, 'request-test');
  }
});

test('lead form schema requires contact consent', () => {
  const result = leadFormSchema.safeParse(buildValidSubmission({ consentToContact: false }));

  assert.equal(result.success, false);
  if (!result.success) {
    const failure = formatLeadFormValidationFailure(result.error);
    assert.equal(failure.fieldErrors?.consentToContact, 'Please agree to be contacted by phone or email.');
    assert.equal(failure.firstErrorStepId, 'contact');
  }
});

test('lead form schema rejects unknown injected fields', () => {
  const result = leadFormSchema.safeParse(buildValidSubmission({ unexpectedAdminOverride: true }));

  assert.equal(result.success, false);
  if (!result.success) {
    const failure = formatLeadFormValidationFailure(result.error);
    assert.equal(failure.error, 'Please remove unsupported fields and try again.');
    assert.deepEqual(failure.formErrors, ['Please remove unsupported fields and try again.']);
    assert.equal(failure.fieldErrors, undefined);
  }
});
