import type { LeadPipelineStage, Prisma, PrismaClient } from '@prisma/client';
import { authorizeLeadAction } from './authorization';
import {
  getPipelineStageLabel,
  isLeadPipelineStage,
  shouldSetLastContactedAt
} from './crm';
import type { OrganisationContext } from './identity';
import { leadOrganisationWhere, updateLeadInOrganisation } from './lead-access';
import { ensureWorkflowInstanceForResource, executeWorkflowTransition } from './workflow';

type DbClient = PrismaClient | Prisma.TransactionClient;

export const LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY = 'solargrant.lead_pipeline';

export async function changeLeadPipelineStage(args: {
  db: DbClient;
  context: OrganisationContext | null | undefined;
  leadId: string;
  nextStage: string;
}) {
  const { db, context, leadId, nextStage } = args;

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
      organisationId: true,
      lastContactedAt: true
    }
  });

  if (!existingLead) {
    throw new Error('Lead not found');
  }

  await ensureWorkflowInstanceForResource({
    db,
    workflowDefinitionKey: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
    organisationId: existingLead.organisationId,
    resourceType: 'lead',
    resourceId: leadId,
    stageKey: existingLead.pipelineStage,
    metadata: {
      source: 'lead_pipeline_lazy_initialisation'
    }
  });

  await executeWorkflowTransition({
    db,
    context,
    workflowDefinitionKey: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
    resourceType: 'lead',
    resourceId: leadId,
    nextStageKey: nextStage,
    fallbackPermission: 'lead.change_status',
    auditAction: 'lead.pipeline_stage_updated',
    auditLeadId: leadId,
    source: 'installer_dashboard',
    metadata: {
      leadId,
      leadName: existingLead.fullName
    },
    onTransition: async ({ previousStage, nextStage: workflowNextStage, metadata, now }) => {
      if (!isLeadPipelineStage(workflowNextStage.key)) {
        throw new Error('Workflow stage is not compatible with lead pipeline projection');
      }

      const leadNextStage = workflowNextStage.key as LeadPipelineStage;
      const updateData: Prisma.LeadUpdateManyMutationInput = {
        pipelineStage: leadNextStage
      };

      if (shouldSetLastContactedAt(leadNextStage)) {
        updateData.lastContactedAt = now;
      }

      if (leadNextStage === 'WON' || leadNextStage === 'LOST') {
        updateData.nextFollowUpAt = null;
      }

      await updateLeadInOrganisation(db, context, leadId, updateData);

      metadata.lastContactedAt = shouldSetLastContactedAt(leadNextStage)
        ? now.toISOString()
        : existingLead.lastContactedAt?.toISOString() ?? null;

      await db.leadActivity.create({
        data: {
          leadId,
          type: 'STAGE_CHANGED',
          title: 'Pipeline stage changed',
          description: `${getPipelineStageLabel(previousStage.key)} to ${getPipelineStageLabel(leadNextStage)}`,
          metadata: {
            previousStage: previousStage.key,
            nextStage: leadNextStage,
            previousStageLabel: getPipelineStageLabel(previousStage.key),
            nextStageLabel: getPipelineStageLabel(leadNextStage)
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
  });
}
