'use server';

import { revalidatePath } from 'next/cache';
import type { LeadPipelineStage, Prisma } from '@prisma/client';
import { writeAuditLog } from '@/lib/audit';
import {
  getPipelineStageLabel,
  isLeadPipelineStage,
  shouldSetLastContactedAt
} from '@/lib/crm';
import { prisma } from '@/lib/prisma';

function getRequiredLeadId(formData: FormData) {
  const leadId = String(formData.get('leadId') || '').trim();
  if (!leadId) throw new Error('Lead id is required');
  return leadId;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const text = String(value || '').trim();
  if (!text) return null;

  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid follow-up date');
  }

  return date;
}

function revalidateLeadCrmPaths(leadId: string) {
  revalidatePath('/admin/dashboard');
  revalidatePath('/installer-review-emerald');
  revalidatePath('/installer-review-emerald/leads');
  revalidatePath(`/installer-review-emerald/leads/${leadId}`);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/admin/dashboard/leads/${leadId}`);
}

export async function updateLeadPipelineStage(formData: FormData) {
  const leadId = getRequiredLeadId(formData);
  const nextStage = String(formData.get('pipelineStage') || '').trim();

  if (!isLeadPipelineStage(nextStage)) {
    throw new Error('Invalid pipeline stage');
  }

  await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findUnique({
      where: { id: leadId },
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
    const updateData: Prisma.LeadUpdateInput = {
      pipelineStage: nextStage as LeadPipelineStage
    };

    if (shouldSetLastContactedAt(nextStage)) {
      updateData.lastContactedAt = now;
    }

    if (nextStage === 'WON' || nextStage === 'LOST') {
      updateData.nextFollowUpAt = null;
    }

    await tx.lead.update({
      where: { id: leadId },
      data: updateData
    });

    if (existingLead.pipelineStage !== nextStage) {
      await tx.leadActivity.create({
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
          createdBy: 'Installer dashboard',
          createdByRole: 'INSTALLER'
        }
      });
    }

    await writeAuditLog(tx, {
      leadId,
      action: 'lead.pipeline_stage_updated',
      actor: 'installer',
      metadata: {
        previousStage: existingLead.pipelineStage,
        nextStage,
        lastContactedAt: shouldSetLastContactedAt(nextStage) ? now.toISOString() : existingLead.lastContactedAt?.toISOString() ?? null
      }
    });
  });

  revalidateLeadCrmPaths(leadId);
}

export async function setLeadFollowUp(formData: FormData) {
  const leadId = getRequiredLeadId(formData);
  const nextFollowUpAt = parseOptionalDate(formData.get('nextFollowUpAt'));

  await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        nextFollowUpAt: true,
        followUpDate: true
      }
    });

    if (!existingLead) {
      throw new Error('Lead not found');
    }

    await tx.lead.update({
      where: { id: leadId },
      data: {
        nextFollowUpAt,
        followUpDate: nextFollowUpAt
      }
    });

    await tx.leadActivity.create({
      data: {
        leadId,
        type: 'FOLLOW_UP_SET',
        title: nextFollowUpAt ? 'Follow-up date set' : 'Follow-up date cleared',
        description: nextFollowUpAt
          ? `Next follow-up scheduled for ${nextFollowUpAt.toISOString().slice(0, 10)}`
          : 'No follow-up date is currently scheduled.',
        metadata: {
          previousFollowUpAt: existingLead.nextFollowUpAt?.toISOString() ?? existingLead.followUpDate?.toISOString() ?? null,
          nextFollowUpAt: nextFollowUpAt?.toISOString() ?? null
        },
        createdBy: 'Installer dashboard',
        createdByRole: 'INSTALLER'
      }
    });

    await writeAuditLog(tx, {
      leadId,
      action: 'lead.follow_up_updated',
      actor: 'installer',
      metadata: {
        previousFollowUpAt: existingLead.nextFollowUpAt?.toISOString() ?? existingLead.followUpDate?.toISOString() ?? null,
        nextFollowUpAt: nextFollowUpAt?.toISOString() ?? null
      }
    });
  });

  revalidateLeadCrmPaths(leadId);
}

export async function addLeadNote(formData: FormData) {
  const leadId = getRequiredLeadId(formData);
  const note = String(formData.get('note') || '').trim();

  if (!note) {
    throw new Error('Note cannot be empty');
  }

  if (note.length > 3000) {
    throw new Error('Note must be 3000 characters or fewer');
  }

  await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findUnique({
      where: { id: leadId },
      select: { id: true }
    });

    if (!existingLead) {
      throw new Error('Lead not found');
    }

    await tx.leadActivity.create({
      data: {
        leadId,
        type: 'NOTE_ADDED',
        title: 'Internal note added',
        description: note,
        metadata: {
          characterCount: note.length
        },
        createdBy: 'Installer dashboard',
        createdByRole: 'INSTALLER'
      }
    });

    await writeAuditLog(tx, {
      leadId,
      action: 'lead.note_added',
      actor: 'installer',
      metadata: {
        characterCount: note.length
      }
    });
  });

  revalidateLeadCrmPaths(leadId);
}
