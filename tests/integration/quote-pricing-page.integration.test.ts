import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { defaultInstallerQuotePricing } from '../../lib/installer-quote-pricing';
import { loadOrganisationQuotePricing } from '../../lib/quote-pricing-page';

const prisma = new PrismaClient();
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const ids = {
  orgA: `org_quote_a_${suffix}`,
  orgB: `org_quote_b_${suffix}`,
  orgEmpty: `org_quote_empty_${suffix}`,
  installerA: `installer_quote_a_${suffix}`,
  installerB: `installer_quote_b_${suffix}`,
  leadA: `lead_quote_a_${suffix}`
};

async function cleanup() {
  await prisma.lead.deleteMany({
    where: { organisationId: { in: [ids.orgA, ids.orgB, ids.orgEmpty] } }
  });
  await prisma.installerQuotePricing.deleteMany({
    where: { installerId: { in: [ids.installerA, ids.installerB] } }
  });
  await prisma.installer.deleteMany({
    where: { id: { in: [ids.installerA, ids.installerB] } }
  });
  await prisma.organisation.deleteMany({
    where: { id: { in: [ids.orgA, ids.orgB, ids.orgEmpty] } }
  });
}

test.before(async () => {
  await cleanup();
  await prisma.organisation.createMany({
    data: [
      {
        id: ids.orgA,
        name: 'Quote Test A',
        slug: `quote-test-a-${suffix}`,
        type: 'INSTALLER',
        status: 'ACTIVE',
        verified: true
      },
      {
        id: ids.orgB,
        name: 'Quote Test B',
        slug: `quote-test-b-${suffix}`,
        type: 'INSTALLER',
        status: 'ACTIVE',
        verified: true
      },
      {
        id: ids.orgEmpty,
        name: 'Quote Test Empty',
        slug: `quote-test-empty-${suffix}`,
        type: 'INSTALLER',
        status: 'ACTIVE',
        verified: true
      }
    ]
  });
  await prisma.installer.createMany({
    data: [
      {
        id: ids.installerA,
        organisationId: ids.orgA,
        name: 'Quote Installer A',
        slug: `quote-installer-a-${suffix}`,
        seaiCompanyId: `QUOTE-A-${suffix}`
      },
      {
        id: ids.installerB,
        organisationId: ids.orgB,
        name: 'Quote Installer B',
        slug: `quote-installer-b-${suffix}`,
        seaiCompanyId: `QUOTE-B-${suffix}`
      }
    ]
  });
  await prisma.installerQuotePricing.create({
    data: {
      installerId: ids.installerB,
      ...defaultInstallerQuotePricing,
      panelUnitCost: 987
    }
  });
  await prisma.lead.create({
    data: {
      id: ids.leadA,
      organisationId: ids.orgA,
      installerId: ids.installerA,
      creationOrigin: 'MANUAL_INSTALLER',
      fullName: `Synthetic Quote Lead ${suffix}`
    }
  });
});

test.after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test('provisioned installer IDs and incomplete legacy lead data load safely', async () => {
  const result = await loadOrganisationQuotePricing(prisma, ids.orgA);

  assert.equal(result.installer?.id, ids.installerA);
  assert.equal(result.pricing?.installerId, ids.installerA);
  assert.equal(result.pricing?.panelUnitCost, defaultInstallerQuotePricing.panelUnitCost);
  assert.equal(result.leads.length, 1);
  assert.equal(result.leads[0]?.county, null);
  assert.equal(result.leads[0]?.worksStarted, null);
  assert.equal(result.leads[0]?.likelyEligible, null);
});

test('quote pricing remains scoped to the requested organisation', async () => {
  const resultA = await loadOrganisationQuotePricing(prisma, ids.orgA);
  const resultB = await loadOrganisationQuotePricing(prisma, ids.orgB);

  assert.equal(resultA.installer?.id, ids.installerA);
  assert.equal(resultA.pricing?.installerId, ids.installerA);
  assert.notEqual(resultA.pricing?.panelUnitCost, 987);
  assert.equal(resultB.installer?.id, ids.installerB);
  assert.equal(resultB.pricing?.installerId, ids.installerB);
  assert.equal(resultB.pricing?.panelUnitCost, 987);
});

test('an organisation without an installer returns an empty state without a pricing write', async () => {
  const before = await prisma.installerQuotePricing.count();
  const result = await loadOrganisationQuotePricing(prisma, ids.orgEmpty);
  const after = await prisma.installerQuotePricing.count();

  assert.equal(result.installer, null);
  assert.equal(result.pricing, null);
  assert.deepEqual(result.leads, []);
  assert.equal(after, before);
});
