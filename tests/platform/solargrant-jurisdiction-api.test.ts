import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as intakePost } from '../../app/api/intake/route';
import { POST as eligibilityPost } from '../../app/api/ai/eligibility/route';
import { prisma } from '../../lib/prisma';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    installerId: 'non-default-test-installer',
    fullName: 'Boundary Test',
    email: 'boundary@example.test',
    phone: '+353871234567',
    addressLine1: '1 Boundary Road',
    addressLine2: '',
    county: 'Dublin',
    eircode: 'D01 F5P2',
    propertyOwner: true,
    privateLandlord: false,
    dwellingType: 'DETACHED',
    yearBuilt: 2010,
    yearOccupied: 2011,
    roofType: 'SLATE',
    roofDirection: 'SOUTH',
    shadingLevel: 'NONE',
    mprn: '10099998887',
    worksStarted: false,
    priorSolarGrantAtMprn: false,
    monthlyElectricityBillRange: 'OVER_200',
    wantsBattery: false,
    selectedSystemSizeVariant: 'recommended',
    evChargerInterest: false,
    hotWaterDiverterInterest: false,
    daytimeUsage: 'MEDIUM',
    installTimeline: 'ASAP',
    preferredCallbackWindow: 'ANYTIME',
    consentToProcess: true,
    consentToGrantAssist: true,
    consentToContact: true,
    applicantDocuments: [],
    ...overrides
  };
}

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('direct NI intake returns the stable 422 contract before installer or duplicate lookup', async () => {
  const installer = prisma.installer as unknown as { findUnique: (...args: unknown[]) => unknown };
  const originalFindUnique = installer.findUnique;
  let lookupCalls = 0;
  installer.findUnique = async () => {
    lookupCalls += 1;
    throw new Error('jurisdiction boundary was bypassed');
  };
  const originalWarn = console.warn;
  console.warn = () => undefined;

  try {
    const response = await intakePost(request('/api/intake', validPayload({ county: 'Antrim', eircode: 'BT7 1AA' })));
    const body = await response.json();
    assert.equal(response.status, 422);
    assert.equal(body.code, 'UNSUPPORTED_PROPERTY_JURISDICTION');
    assert.equal(body.firstErrorStepId, 'property');
    assert.equal(lookupCalls, 0);
    assert.equal(JSON.stringify(body).includes('BT7 1AA'), false);
    assert.equal(JSON.stringify(body).includes('10099998887'), false);
  } finally {
    installer.findUnique = originalFindUnique;
    console.warn = originalWarn;
  }
});

test('conflicting intake and eligibility requests share the stable ambiguity contract', async () => {
  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    for (const [path, handler] of [
      ['/api/intake', intakePost],
      ['/api/ai/eligibility', eligibilityPost]
    ] as const) {
      const response = await handler(request(path, validPayload({ county: 'Dublin', eircode: 'BT7 1AA' })));
      const body = await response.json();
      assert.equal(response.status, 422);
      assert.equal(body.code, 'AMBIGUOUS_PROPERTY_JURISDICTION');
      assert.equal(body.firstErrorField, 'eircode');
    }
  } finally {
    console.warn = originalWarn;
  }
});

test('unknown counties and malformed supplied Eircodes retain structured 400 validation', async () => {
  for (const overrides of [{ county: 'Synthetic County' }, { eircode: 'invalid' }]) {
    const response = await eligibilityPost(request('/api/ai/eligibility', validPayload(overrides)));
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error, 'Please review the highlighted fields.');
    assert.equal(body.firstErrorStepId, 'property');
  }
});
