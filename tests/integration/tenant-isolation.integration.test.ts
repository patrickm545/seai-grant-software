import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  OrganisationRecordAccessError,
  deleteLeadInOrganisation,
  leadActivityOrganisationWhere,
  leadOrganisationWhere,
  updateLeadInOrganisation
} from '../../lib/lead-access';
import { getDashboardMetrics } from '../../lib/dashboard-metrics';
import { adaptSolarGrantLeadForPresentation } from '../../lib/solargrant-jurisdiction-safe-view';
import { buildPortalFillPreview, buildSubmissionPackage } from '../../lib/submission-package';
import { SolarGrantJurisdictionError } from '../../lib/solargrant-jurisdiction';
import { buildSubmissionPackageDownload } from '../../lib/submission-package-download';

const prisma = new PrismaClient();
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);

const orgA = `org_test_a_${suffix}`;
const orgB = `org_test_b_${suffix}`;
const installerA = `installer_test_a_${suffix}`;
const installerB = `installer_test_b_${suffix}`;
const leadA = `lead_test_a_${suffix}`;
const leadB = `lead_test_b_${suffix}`;
const mismatchedLead = `lead_test_mismatch_${suffix}`;
const historicalNiLead = `lead_test_ni_${suffix}`;

const scopeA = { organisationId: orgA };
const scopeB = { organisationId: orgB };

test.after(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

function leadData(input: {
  id: string;
  organisationId: string;
  installerId: string;
  fullName: string;
  email: string;
  mprn: string;
}) {
  return {
    creationOrigin: 'HOMEOWNER_INTAKE' as const,
    id: input.id,
    organisationId: input.organisationId,
    installerId: input.installerId,
    fullName: input.fullName,
    email: input.email,
    addressLine1: '1 Test Street',
    county: 'Dublin',
    propertyOwner: true,
    dwellingType: 'DETACHED' as const,
    yearBuilt: 2016,
    mprn: input.mprn,
    worksStarted: false,
    consentToProcess: true,
    consentToGrantAssist: true
  };
}

async function cleanupTestData() {
  await prisma.lead.deleteMany({
    where: {
      id: {
        in: [leadA, leadB, mismatchedLead, historicalNiLead]
      }
    }
  });
  await prisma.installer.deleteMany({
    where: {
      id: {
        in: [installerA, installerB]
      }
    }
  });
  await prisma.organisation.deleteMany({
    where: {
      id: {
        in: [orgA, orgB]
      }
    }
  });
}

async function seedTestData() {
  await cleanupTestData();
  await prisma.organisation.createMany({
    data: [
      { id: orgA, name: 'Tenant Isolation Test A', slug: `tenant-a-${suffix}`, type: 'INSTALLER' },
      { id: orgB, name: 'Tenant Isolation Test B', slug: `tenant-b-${suffix}`, type: 'INSTALLER' }
    ]
  });

  await prisma.installer.createMany({
    data: [
      {
        id: installerA,
        organisationId: orgA,
        name: 'Installer Test A',
        slug: `tenant-installer-a-${suffix}`,
        seaiCompanyId: `SEAI-A-${suffix}`
      },
      {
        id: installerB,
        organisationId: orgB,
        name: 'Installer Test B',
        slug: `tenant-installer-b-${suffix}`,
        seaiCompanyId: `SEAI-B-${suffix}`
      }
    ]
  });

  await prisma.lead.createMany({
    data: [
      leadData({
        id: leadA,
        organisationId: orgA,
        installerId: installerA,
        fullName: 'Tenant A Homeowner',
        email: `tenant-a-${suffix}@example.test`,
        mprn: '10000000001'
      }),
      leadData({
        id: leadB,
        organisationId: orgB,
        installerId: installerB,
        fullName: 'Tenant B Homeowner',
        email: `tenant-b-${suffix}@example.test`,
        mprn: '10000000002'
      })
    ]
  });

  await prisma.lead.update({
    where: { id: leadB },
    data: { leadScore: 'HOT', pipelineStage: 'QUALIFIED', status: 'SUBMITTED' }
  });

  await prisma.leadActivity.createMany({
    data: [
      { leadId: leadA, type: 'LEAD_CREATED', title: 'Tenant A activity' },
      { leadId: leadB, type: 'LEAD_CREATED', title: 'Tenant B activity' }
    ]
  });
}

test('database-backed tenant isolation rejects cross-organisation lead access', async (t) => {
  await prisma.$connect();
  await seedTestData();

  t.after(async () => {
    await cleanupTestData();
  });

  const ownLeadForA = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeA, { id: leadA })
  });
  assert.equal(ownLeadForA?.id, leadA);

  const tenantBLeadForA = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeA, { id: leadB })
  });
  assert.equal(tenantBLeadForA, null);

  await assert.rejects(
    updateLeadInOrganisation(prisma, scopeA, leadB, { internalNotes: 'cross-tenant update attempt' }),
    (error) => error instanceof OrganisationRecordAccessError
  );
  const unchangedTenantBLead = await prisma.lead.findUniqueOrThrow({ where: { id: leadB } });
  assert.equal(unchangedTenantBLead.internalNotes, null);

  await assert.rejects(
    deleteLeadInOrganisation(prisma, scopeA, leadB),
    (error) => error instanceof OrganisationRecordAccessError
  );
  assert.ok(await prisma.lead.findUnique({ where: { id: leadB } }));

  const tenantALeadForB = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeB, { id: leadA })
  });
  assert.equal(tenantALeadForB, null);

  const spoofedOrganisationWhere = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeA, {
      id: leadB,
      organisationId: orgB
    })
  });
  assert.equal(spoofedOrganisationWhere, null);
});

test('database constraint rejects lead installer ownership mismatch', async (t) => {
  await seedTestData();
  t.after(cleanupTestData);

  await assert.rejects(
    prisma.lead.create({
      data: leadData({
        id: mismatchedLead,
        organisationId: orgA,
        installerId: installerB,
        fullName: 'Mismatched Tenant Homeowner',
        email: `tenant-mismatch-${suffix}@example.test`,
        mprn: '10000000003'
      })
    }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
  );

  await cleanupTestData();
});

test('dashboard records, metrics, and activity remain organisation scoped', async (t) => {
  await seedTestData();
  t.after(cleanupTestData);

  const [tenantALeads, tenantAActivities] = await Promise.all([
    prisma.lead.findMany({
      where: leadOrganisationWhere(scopeA),
      include: { documents: true }
    }),
    prisma.leadActivity.findMany({
      where: leadActivityOrganisationWhere(scopeA)
    })
  ]);

  assert.deepEqual(tenantALeads.map((lead) => lead.id), [leadA]);
  assert.deepEqual(tenantAActivities.map((activity) => activity.title), ['Tenant A activity']);

  const metrics = getDashboardMetrics(tenantALeads);
  assert.equal(metrics.activeLeads, 1);
  assert.equal(metrics.hotLeads, 0);
  assert.equal(metrics.applicationsSubmitted, 0);
  assert.equal(metrics.pipelineCounts.NEW_LEAD, 1);
  assert.equal(metrics.pipelineCounts.QUALIFIED, 0);
});

test('structured export attachment is built only from the organisation-scoped lead', async (t) => {
  await seedTestData();
  t.after(cleanupTestData);

  const ownLead = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeA, { id: leadA }),
    include: { installer: true, documents: true }
  });
  const crossTenantLead = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeA, { id: leadB }),
    include: { installer: true, documents: true }
  });

  assert.ok(ownLead);
  assert.equal(crossTenantLead, null);

  const payload = buildSubmissionPackage(ownLead, ownLead.installer);
  const response = buildSubmissionPackageDownload(payload);
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="solargrant-application-pack.json"');
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal((await response.json() as { applicant: { fullName: string } }).applicant.fullName, 'Tenant A Homeowner');
});

test('historical unsupported records stay stored, tenant scoped, and unsafe exports are refused', async (t) => {
  await seedTestData();
  t.after(cleanupTestData);

  await prisma.lead.create({
    data: {
      ...leadData({
        id: historicalNiLead,
        organisationId: orgA,
        installerId: installerA,
        fullName: 'Historical NI Homeowner',
        email: `tenant-ni-${suffix}@example.test`,
        mprn: '10000000004'
      }),
      county: 'Antrim',
      eircode: 'BT7 1AA',
      likelyEligible: true,
      eligibilityConfidence: 0.95,
      aiSummary: 'Historical positive SEAI conclusion',
      structuredExportJson: {
        quoteEstimate: {
          estimatedSeaiGrantDeduction: 1800,
          netCostRangeAfterGrant: { min: 5000, max: 6000 },
          grantLikely: true
        }
      }
    }
  });

  const storedForA = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeA, { id: historicalNiLead }),
    include: { installer: true, documents: true }
  });
  assert.ok(storedForA);
  const hiddenFromB = await prisma.lead.findFirst({
    where: leadOrganisationWhere(scopeB, { id: historicalNiLead })
  });
  assert.equal(hiddenFromB, null);

  const safe = adaptSolarGrantLeadForPresentation(storedForA);
  assert.equal(safe.county, 'Antrim');
  assert.equal(safe.likelyEligible, null);
  assert.equal(safe.jurisdictionView.status, 'UNSUPPORTED');
  assert.equal(JSON.stringify(safe).includes('Historical positive SEAI conclusion'), false);
  assert.equal(JSON.stringify(safe).includes('1800'), false);

  assert.throws(() => buildSubmissionPackage(storedForA, storedForA.installer), SolarGrantJurisdictionError);
  assert.throws(() => buildPortalFillPreview(storedForA, storedForA.installer), SolarGrantJurisdictionError);
});
