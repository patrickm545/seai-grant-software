import type { Prisma, PrismaClient } from '@prisma/client';
import { defaultInstallerQuotePricing } from './installer-quote-pricing';
import { leadOrganisationWhere } from './lead-access';

const quotePricingLeadSelect = {
  county: true,
  eircode: true,
  status: true,
  worksStarted: true,
  priorSolarGrantAtMprn: true,
  likelyEligible: true,
  pipelineStage: true,
  leadScore: true,
  documents: { select: { id: true } }
} satisfies Prisma.LeadSelect;

export type QuotePricingPageDb = Pick<PrismaClient, 'installer' | 'installerQuotePricing' | 'lead'>;

export async function loadOrganisationQuotePricing(
  db: QuotePricingPageDb,
  organisationId: string
) {
  const [installer, leads] = await Promise.all([
    db.installer.findFirst({
      where: { organisationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true }
    }),
    db.lead.findMany({
      where: leadOrganisationWhere({ organisationId }),
      select: quotePricingLeadSelect,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (!installer) {
    return { installer: null, pricing: null, leads };
  }

  const pricing = await db.installerQuotePricing.upsert({
    where: { installerId: installer.id },
    update: {},
    create: {
      installerId: installer.id,
      ...defaultInstallerQuotePricing
    }
  });

  return { installer, pricing, leads };
}
