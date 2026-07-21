import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { POST as intakePost } from '../../app/api/intake/route';

const db = new PrismaClient();
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const organisationId = `org_jurisdiction_${suffix}`;
const installerId = `installer_jurisdiction_${suffix}`;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    installerId,
    fullName: 'Jurisdiction Integration Homeowner',
    email: `jurisdiction-${suffix}@example.test`,
    phone: '+353871234567',
    addressLine1: '1 Integration Road',
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
    numberOfOccupants: 3,
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

function request(body: unknown) {
  return new NextRequest('http://localhost/api/intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function cleanup() {
  const leads = await db.lead.findMany({ where: { installerId }, select: { id: true } });
  const leadIds = leads.map((lead) => lead.id);
  await db.auditLog.deleteMany({ where: { OR: [{ leadId: { in: leadIds } }, { organisationId }] } });
  await db.workflowHistory.deleteMany({ where: { organisationId } });
  await db.workflowInstance.deleteMany({ where: { organisationId } });
  await db.leadActivity.deleteMany({ where: { leadId: { in: leadIds } } });
  await db.leadDocument.deleteMany({ where: { leadId: { in: leadIds } } });
  await db.lead.deleteMany({ where: { installerId } });
  await db.installerQuotePricing.deleteMany({ where: { installerId } });
  await db.installer.deleteMany({ where: { id: installerId } });
  await db.organisation.deleteMany({ where: { id: organisationId } });
}

test.after(async () => {
  await cleanup();
  await db.$disconnect();
});

test('ROI intake succeeds while NI rejection creates no lead-scoped side effect', async (t) => {
  await cleanup();
  t.after(cleanup);
  await db.organisation.create({
    data: { id: organisationId, name: 'Jurisdiction Integration', slug: `jurisdiction-${suffix}`, type: 'INSTALLER' }
  });
  await db.installer.create({
    data: {
      id: installerId,
      organisationId,
      name: 'Jurisdiction Installer',
      slug: `jurisdiction-installer-${suffix}`,
      seaiCompanyId: `SEAI-J-${suffix}`
    }
  });

  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    const rejected = await intakePost(request(payload({ county: 'Antrim', eircode: 'BT7 1AA' })));
    assert.equal(rejected.status, 422);
    assert.equal((await rejected.json()).code, 'UNSUPPORTED_PROPERTY_JURISDICTION');
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(await db.lead.count({ where: { organisationId } }), 0);
  assert.equal(await db.installerQuotePricing.count({ where: { installerId } }), 0);
  assert.equal(await db.workflowInstance.count({ where: { organisationId } }), 0);
  assert.equal(await db.auditLog.count({ where: { organisationId } }), 0);

  const accepted = await intakePost(request(payload()));
  const acceptedBody = await accepted.json();
  assert.equal(accepted.status, 200);
  assert.equal(typeof acceptedBody.leadId, 'string');
  assert.equal(acceptedBody.analysis.likelyEligible, true);
  assert.ok(acceptedBody.quoteEstimate.estimatedSeaiGrantDeduction > 0);
  assert.equal(await db.lead.count({ where: { organisationId } }), 1);
  assert.equal(await db.installerQuotePricing.count({ where: { installerId } }), 1);
  assert.equal(await db.workflowInstance.count({ where: { organisationId } }), 1);
  assert.ok(await db.auditLog.count({ where: { organisationId } }) > 0);
});
