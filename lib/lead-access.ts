import type { Prisma, PrismaClient } from '@prisma/client';
import type { OrganisationContext } from './identity';

type DbClient = PrismaClient | Prisma.TransactionClient;
type OrganisationScope = Pick<OrganisationContext, 'organisationId'>;

export class OrganisationRecordAccessError extends Error {
  constructor(message = 'Record is not available in this organisation context.') {
    super(message);
    this.name = 'OrganisationRecordAccessError';
  }
}

export function leadOrganisationWhere(
  scope: OrganisationScope,
  where: Prisma.LeadWhereInput = {}
): Prisma.LeadWhereInput {
  return {
    AND: [
      {
        organisationId: scope.organisationId
      },
      where
    ]
  };
}

export function leadActivityOrganisationWhere(
  scope: OrganisationScope,
  where: Prisma.LeadActivityWhereInput = {}
): Prisma.LeadActivityWhereInput {
  return {
    AND: [
      {
        lead: {
          organisationId: scope.organisationId
        }
      },
      where
    ]
  };
}

export function leadDocumentOrganisationWhere(
  scope: OrganisationScope,
  where: Prisma.LeadDocumentWhereInput = {}
): Prisma.LeadDocumentWhereInput {
  return {
    AND: [
      {
        lead: {
          organisationId: scope.organisationId
        }
      },
      where
    ]
  };
}

export async function requireLeadInOrganisation(db: DbClient, scope: OrganisationScope, leadId: string) {
  const lead = await db.lead.findFirst({
    where: leadOrganisationWhere(scope, { id: leadId }),
    select: {
      id: true
    }
  });

  if (!lead) {
    throw new OrganisationRecordAccessError();
  }

  return lead;
}

export async function updateLeadInOrganisation(
  db: DbClient,
  scope: OrganisationScope,
  leadId: string,
  data: Prisma.LeadUpdateManyMutationInput
) {
  const result = await db.lead.updateMany({
    where: leadOrganisationWhere(scope, { id: leadId }),
    data
  });

  if (result.count !== 1) {
    throw new OrganisationRecordAccessError();
  }

  return result;
}

export async function deleteLeadInOrganisation(db: DbClient, scope: OrganisationScope, leadId: string) {
  await requireLeadInOrganisation(db, scope, leadId);
  return db.lead.delete({
    where: { id: leadId }
  });
}
