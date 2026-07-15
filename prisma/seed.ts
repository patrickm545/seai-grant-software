import { readFileSync, existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { ensureDefaultInstallerWithOrganisation } from '../lib/identity';
import { defaultInstallerQuotePricing } from '../lib/installer-quote-pricing';
import { LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY } from '../lib/lead-workflow';
import { ensureWorkflowInstanceForResource } from '../lib/workflow';
import { assertDatabaseOperationAllowed, formatDatabaseSafetyError } from '../lib/database-safety';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const rawLine of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^"(.*)"$/, '$1');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

try {
  assertDatabaseOperationAllowed({
    operation: 'seed',
    appEnvironment: process.env.APP_ENV,
    databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
    databaseUrl: process.env.DATABASE_URL,
    expectedFingerprint: process.env.DATABASE_FINGERPRINT,
    productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: process.env.DATABASE_BRANCH_ID
  });
} catch (error) {
  console.error(formatDatabaseSafetyError(error));
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const installer = await ensureDefaultInstallerWithOrganisation(prisma);

  await prisma.installerQuotePricing.upsert({
    where: { installerId: installer.id },
    update: {},
    create: {
      installerId: installer.id,
      ...defaultInstallerQuotePricing
    }
  });

  const salesSignal = (leadTemperature: string, installTimeline: string, monthlyElectricityBillRange: string, wantsBattery: boolean) => ({
    salesSignal: {
      leadTemperature,
      installTimeline,
      monthlyElectricityBillRange,
      wantsBattery,
      preferredCallbackWindow: 'AFTERNOON',
      roofType: 'SLATE'
    }
  });

  const lead1 = await prisma.lead.upsert({
    where: { id: 'demo-lead-1' },
    update: {
      organisationId: installer.organisationId,
      installerId: installer.id,
      pipelineStage: 'QUALIFIED',
      leadScore: 'HOT',
      scoreUpdatedAt: now
    },
    create: {
      id: 'demo-lead-1',
      organisationId: installer.organisationId,
      installerId: installer.id,
      fullName: 'John Murphy',
      email: 'john@example.com',
      phone: '+353871234567',
      addressLine1: '12 Oak Drive',
      county: 'Dublin',
      eircode: 'D01TEST',
      propertyOwner: true,
      privateLandlord: false,
      dwellingType: 'DETACHED',
      yearBuilt: 2015,
      yearOccupied: 2015,
      mprn: '10012345678',
      worksStarted: false,
      priorSolarGrantAtMprn: false,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: true,
      pipelineStage: 'QUALIFIED',
      leadScore: 'HOT',
      scoreUpdatedAt: now,
      status: 'READY_TO_APPLY',
      likelyEligible: true,
      eligibilityConfidence: 0.92,
      aiSummary: 'Looks eligible based on provided details. Needs electricity bill upload for verification.',
      risksJson: [],
      missingItemsJson: ['Electricity bill upload'],
      structuredExportJson: {
        grants: ['Solar Electricity Grant'],
        installer: installer.name,
        seaiCompanyId: installer.seaiCompanyId,
        homeownerReview: 'Ready for final admin review',
        ...salesSignal('HOT', 'ASAP', 'OVER_200', true)
      }
    }
  });

  const lead2 = await prisma.lead.upsert({
    where: { id: 'demo-lead-2' },
    update: {
      organisationId: installer.organisationId,
      installerId: installer.id,
      pipelineStage: 'CONTACTED',
      leadScore: 'WARM',
      scoreUpdatedAt: now
    },
    create: {
      id: 'demo-lead-2',
      organisationId: installer.organisationId,
      installerId: installer.id,
      fullName: 'Aoife Byrne',
      email: 'aoife@example.com',
      phone: '+353851112223',
      addressLine1: '48 River View',
      county: 'Cork',
      eircode: 'T12DEMO',
      propertyOwner: true,
      privateLandlord: false,
      dwellingType: 'SEMI_DETACHED',
      yearBuilt: 2008,
      yearOccupied: 2009,
      mprn: '10098765432',
      worksStarted: false,
      priorSolarGrantAtMprn: false,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: true,
      pipelineStage: 'CONTACTED',
      leadScore: 'WARM',
      lastContactedAt: now,
      scoreUpdatedAt: now,
      status: 'NEEDS_REVIEW',
      likelyEligible: true,
      eligibilityConfidence: 0.81,
      aiSummary: 'Likely eligible, but roof orientation details and proof of address still need review.',
      risksJson: ['Roof suitability not yet confirmed'],
      missingItemsJson: ['Proof of address', 'Roof orientation photos'],
      structuredExportJson: {
        grants: ['Solar Electricity Grant'],
        installer: installer.name,
        seaiCompanyId: installer.seaiCompanyId,
        homeownerReview: 'Pending evidence upload',
        ...salesSignal('WARM', 'ONE_TO_THREE_MONTHS', 'BETWEEN_150_AND_200', false)
      }
    }
  });

  const lead3 = await prisma.lead.upsert({
    where: { id: 'demo-lead-3' },
    update: {
      organisationId: installer.organisationId,
      installerId: installer.id,
      pipelineStage: 'SURVEY_BOOKED',
      leadScore: 'WARM',
      nextFollowUpAt: now,
      scoreUpdatedAt: now
    },
    create: {
      id: 'demo-lead-3',
      organisationId: installer.organisationId,
      installerId: installer.id,
      fullName: 'Patrick O Sullivan',
      email: 'patrick@example.com',
      phone: '+353861234890',
      addressLine1: '7 Hazel Close',
      county: 'Galway',
      eircode: 'H91DEMO',
      propertyOwner: true,
      privateLandlord: false,
      dwellingType: 'BUNGALOW',
      yearBuilt: 1998,
      yearOccupied: 1998,
      mprn: '10011223344',
      worksStarted: false,
      priorSolarGrantAtMprn: false,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: true,
      pipelineStage: 'SURVEY_BOOKED',
      leadScore: 'WARM',
      lastContactedAt: now,
      nextFollowUpAt: now,
      scoreUpdatedAt: now,
      status: 'HOMEOWNER_REVIEW_PENDING',
      likelyEligible: true,
      eligibilityConfidence: 0.88,
      aiSummary: 'Draft submission prepared and sent to homeowner for final review.',
      risksJson: [],
      missingItemsJson: ['Signed homeowner consent'],
      structuredExportJson: {
        grants: ['Solar Electricity Grant'],
        installer: installer.name,
        seaiCompanyId: installer.seaiCompanyId,
        homeownerReview: 'Awaiting homeowner sign-off',
        ...salesSignal('WARM', 'ONE_TO_THREE_MONTHS', 'BETWEEN_100_AND_150', true)
      }
    }
  });

  const lead4 = await prisma.lead.upsert({
    where: { id: 'demo-lead-4' },
    update: {
      organisationId: installer.organisationId,
      installerId: installer.id,
      pipelineStage: 'QUOTE_SENT',
      leadScore: 'HOT',
      scoreUpdatedAt: now
    },
    create: {
      id: 'demo-lead-4',
      organisationId: installer.organisationId,
      installerId: installer.id,
      fullName: 'Niamh Kelly',
      email: 'niamh@example.com',
      phone: '+353879991122',
      addressLine1: '22 Meadow Park',
      county: 'Limerick',
      eircode: 'V94DEMO',
      propertyOwner: true,
      privateLandlord: false,
      dwellingType: 'TERRACED',
      yearBuilt: 1987,
      yearOccupied: 1987,
      mprn: '10055667788',
      worksStarted: false,
      priorSolarGrantAtMprn: false,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: false,
      pipelineStage: 'QUOTE_SENT',
      leadScore: 'HOT',
      lastContactedAt: now,
      scoreUpdatedAt: now,
      status: 'SUBMITTED',
      likelyEligible: true,
      eligibilityConfidence: 0.95,
      aiSummary: 'Application submitted successfully and awaiting installer scheduling.',
      risksJson: [],
      missingItemsJson: [],
      structuredExportJson: {
        grants: ['Solar Electricity Grant'],
        installer: installer.name,
        seaiCompanyId: installer.seaiCompanyId,
        homeownerReview: 'Submitted to workflow',
        ...salesSignal('HOT', 'ASAP', 'OVER_200', true)
      }
    }
  });

  const lead5 = await prisma.lead.upsert({
    where: { id: 'demo-lead-5' },
    update: {
      organisationId: installer.organisationId,
      installerId: installer.id,
      pipelineStage: 'LOST',
      leadScore: 'COLD',
      scoreUpdatedAt: now
    },
    create: {
      id: 'demo-lead-5',
      organisationId: installer.organisationId,
      installerId: installer.id,
      fullName: 'Declan Walsh',
      email: 'declan@example.com',
      phone: '+353877770001',
      addressLine1: '3 Coast Road',
      county: 'Waterford',
      eircode: 'X91DEMO',
      propertyOwner: false,
      privateLandlord: true,
      dwellingType: 'OTHER',
      yearBuilt: 1974,
      yearOccupied: 2020,
      mprn: '10044332211',
      worksStarted: true,
      priorSolarGrantAtMprn: false,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: true,
      pipelineStage: 'LOST',
      leadScore: 'COLD',
      scoreUpdatedAt: now,
      status: 'NEEDS_REVIEW',
      likelyEligible: false,
      eligibilityConfidence: 0.69,
      aiSummary: 'Needs manual review because works may have started before approval and ownership is unclear.',
      risksJson: ['Works may have started before grant approval', 'Applicant is not marked as the property owner'],
      missingItemsJson: ['Ownership clarification', 'Grant approval confirmation'],
      structuredExportJson: {
        grants: ['Solar Electricity Grant'],
        installer: installer.name,
        seaiCompanyId: installer.seaiCompanyId,
        homeownerReview: 'Escalated for manual review',
        ...salesSignal('COLD', 'JUST_RESEARCHING', 'BETWEEN_100_AND_150', false)
      }
    }
  });

  for (const lead of [lead1, lead2, lead3, lead4, lead5]) {
    await ensureWorkflowInstanceForResource({
      db: prisma,
      workflowDefinitionKey: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
      organisationId: lead.organisationId,
      resourceType: 'lead',
      resourceId: lead.id,
      stageKey: lead.pipelineStage,
      metadata: {
        source: 'seed'
      }
    });
  }

  await prisma.leadDocument.upsert({
    where: { id: 'demo-doc-1' },
    update: {},
    create: {
      id: 'demo-doc-1',
      leadId: lead1.id,
      fileName: 'electricity-bill-april.pdf',
      mimeType: 'application/pdf',
      storageUrl: '/demo/electricity-bill-april.pdf',
      extractedText: 'Electricity bill for 12 Oak Drive showing MPRN 10012345678 and homeowner John Murphy.',
      aiFieldsJson: {
        mprn: '10012345678',
        addressMatch: true,
        homeownerName: 'John Murphy'
      }
    }
  });

  await prisma.leadDocument.upsert({
    where: { id: 'demo-doc-2' },
    update: {},
    create: {
      id: 'demo-doc-2',
      leadId: lead2.id,
      fileName: 'proof-of-address.png',
      mimeType: 'image/png',
      storageUrl: '/demo/proof-of-address.png',
      extractedText: 'Proof of address received for Aoife Byrne, but roof orientation evidence is still outstanding.',
      aiFieldsJson: {
        homeownerName: 'Aoife Byrne',
        addressVerified: true,
        roofPhotosProvided: false
      }
    }
  });

  const activitySeeds = [
    {
      id: 'demo-activity-1-created',
      leadId: lead1.id,
      type: 'LEAD_CREATED' as const,
      title: 'Lead created',
      description: 'Demo homeowner lead submitted through the public intake flow.',
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'demo-activity-1-stage',
      leadId: lead1.id,
      type: 'STAGE_CHANGED' as const,
      title: 'Pipeline stage changed',
      description: 'New Lead to Qualified',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'demo-activity-2-created',
      leadId: lead2.id,
      type: 'LEAD_CREATED' as const,
      title: 'Lead created',
      description: 'Demo homeowner lead submitted through the public intake flow.',
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'demo-activity-2-note',
      leadId: lead2.id,
      type: 'NOTE_ADDED' as const,
      title: 'Internal note added',
      description: 'Call back after roof photos are received.',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'demo-activity-3-follow-up',
      leadId: lead3.id,
      type: 'FOLLOW_UP_SET' as const,
      title: 'Follow-up date set',
      description: 'Next follow-up scheduled for survey confirmation.',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    },
    {
      id: 'demo-activity-4-stage',
      leadId: lead4.id,
      type: 'STAGE_CHANGED' as const,
      title: 'Pipeline stage changed',
      description: 'Survey Completed to Quote Sent',
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
    },
    {
      id: 'demo-activity-5-stage',
      leadId: lead5.id,
      type: 'STAGE_CHANGED' as const,
      title: 'Pipeline stage changed',
      description: 'New Lead to Lost',
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000)
    }
  ];

  for (const activity of activitySeeds) {
    await prisma.leadActivity.upsert({
      where: { id: activity.id },
      update: {
        title: activity.title,
        description: activity.description,
        createdAt: activity.createdAt
      },
      create: {
        ...activity,
        metadata: { source: 'seed' },
        createdBy: 'Seed data',
        createdByRole: 'SYSTEM'
      }
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
