import type { Prisma, PrismaClient } from '@prisma/client';
import type { OrganisationContext } from './identity';
import { requireLeadInOrganisation } from './lead-access';
import { type PlatformPermission, requirePermission } from './permissions';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function authorizeLeadAction(args: {
  db: DbClient;
  context: OrganisationContext | null | undefined;
  leadId: string;
  permission: PlatformPermission;
}) {
  const { db, context, leadId, permission } = args;

  requirePermission(context, permission);
  await requireLeadInOrganisation(db, context, leadId);
}
