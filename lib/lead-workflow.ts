import type { LeadPipelineStage, Prisma, PrismaClient } from '@prisma/client';
import { writeAuditEvent } from './audit';
import { authorizeLeadAction } from './authorization';
import {
  getPipelineStageLabel,
  isLeadPipelineStage,
  shouldSetLastContactedAt
} from './crm';
import type { OrganisationContext } from './identity';
import { leadOrganisationWhere, updateLeadInOrganisation } from './lead-access';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function changeLeadPipelineStage(args: {
  db: DbClient;
  context: OrganisationContext | null | undefined;
  leadId: string;
  nextStage: string;
}) {
  const { db, context, leadId, nextStage } = args;

  if (!isLeadPipelineStage(nextStage)) {
    throw new Error('Invalid pipeline stage');
  }

  await authorizeLeadAction({
    db,
    context,
    leadId,
    permission: 'lead.change_status'
  });

  if (!context) {
    throw new Error('Organisation context is required');
  }

  const existingLead = await db.lead.findFirst({
    where: leadOrganisationWhere(context, { id: leadId }),
    select: {
      id: true,
      fullName: true,
      pipelineStage: true,
      lastContactedAt: true
    }
  });

  if (!existingLead) {
    throw new Error('Lead not found');
  }

  const now = new Date();
  const updateData: Prisma.LeadUpdateManyMutationInput = {
    pipelineStage: nextStage as LeadPipelineStage
  };

  if (shouldSetLastContactedAt(nextStage)) {
    updateData.lastContactedAt = now;
  }

  if (nextStage === 'WON' || nextStage === 'LOST') {
    updateData.nextFollowUpAt = null;
  }

  await updateLeadInOrganisation(db, context, leadId, updateData);

  if (existingLead.pipelineStage !== nextStage) {
    await db.leadActivity.create({
      data: {
        leadId,
        type: 'STAGE_CHANGED',
        title: 'Pipeline stage changed',
        description: `${getPipelineStageLabel(existingLead.pipelineStage)} to ${getPipelineStageLabel(nextStage)}`,
        metadata: {
          previousStage: existingLead.pipelineStage,
          nextStage,
          previousStageLabel: getPipelineStageLabel(existingLead.pipelineStage),
          nextStageLabel: getPipelineStageLabel(nextStage)
        },
        createdBy: context.actor.displayName,
        createdByRole: context.role,
        actorType: 'HUMAN_USER',
        actorUserId: context.actor.actorType === 'human_user' ? context.actor.userId : null,
        actorMembershipId: context.membershipId,
        actorOrganisationId: context.organisationId
      }
    });
  }

  await writeAuditEvent(db, {
    leadId,
    context,
    action: 'lead.pipeline_stage_updated',
    resourceType: 'lead',
    resourceId: leadId,
    source: 'installer_dashboard',
    outcome: 'SUCCEEDED',
    metadata: {
      previousStage: existingLead.pipelineStage,
      nextStage,
      lastContactedAt: shouldSetLastContactedAt(nextStage) ? now.toISOString() : existingLead.lastContactedAt?.toISOString() ?? null
    }
  });
}
