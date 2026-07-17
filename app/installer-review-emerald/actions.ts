'use server';

import { revalidatePath } from 'next/cache';
import type { LeadActivityType, LeadDocumentStatus } from '@prisma/client';
import { writeAuditLog } from '@/lib/audit';
import {
  getDocumentStatusLabel,
  getDocumentTypeLabel,
  isLeadDocumentStatus
} from '@/lib/documents';
import { requirePilotContext } from '@/lib/pilot-auth';
import {
  leadDocumentOrganisationWhere,
  leadOrganisationWhere,
  requireLeadInOrganisation,
  updateLeadInOrganisation
} from '@/lib/lead-access';
import { changeLeadPipelineStage } from '@/lib/lead-workflow';
import { regenerateLeadPortalToken } from '@/lib/portal';
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

function revalidateLeadCrmPaths(leadId: string, portalToken?: string | null) {
  revalidatePath('/admin/dashboard');
  revalidatePath('/installer-review-emerald');
  revalidatePath('/installer-review-emerald/leads');
  revalidatePath(`/installer-review-emerald/leads/${leadId}`);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/admin/dashboard/leads/${leadId}`);
  if (portalToken) revalidatePath(`/portal/${portalToken}`);
}

function getRequiredDocumentId(formData: FormData) {
  const documentId = String(formData.get('documentId') || '').trim();
  if (!documentId) throw new Error('Document id is required');
  return documentId;
}

function getDocumentActivityType(status: LeadDocumentStatus): LeadActivityType {
  if (status === 'APPROVED') return 'DOCUMENT_APPROVED';
  if (status === 'REJECTED') return 'DOCUMENT_REJECTED';
  if (status === 'NEEDS_REPLACEMENT') return 'DOCUMENT_NEEDS_REPLACEMENT';
  return 'SYSTEM_EVENT';
}

export async function updateLeadPipelineStage(formData: FormData) {
  const organisationContext = await requirePilotContext();
  const leadId = getRequiredLeadId(formData);
  const nextStage = String(formData.get('pipelineStage') || '').trim();

  await prisma.$transaction(async (tx) => {
    await changeLeadPipelineStage({
      db: tx,
      context: organisationContext,
      leadId,
      nextStage
    });
  });

  revalidateLeadCrmPaths(leadId);
}

export async function setLeadFollowUp(formData: FormData) {
  const organisationContext = await requirePilotContext();
  const leadId = getRequiredLeadId(formData);
  const nextFollowUpAt = parseOptionalDate(formData.get('nextFollowUpAt'));

  await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id: leadId }),
      select: {
        id: true,
        nextFollowUpAt: true,
        followUpDate: true
      }
    });

    if (!existingLead) {
      throw new Error('Lead not found');
    }

    await updateLeadInOrganisation(tx, organisationContext, leadId, {
      nextFollowUpAt,
      followUpDate: nextFollowUpAt
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
        nextFollowUpAt: nextFollowUpAt?.toISOString() ?? null,
        organisationId: organisationContext.organisationId
      }
    });
  });

  revalidateLeadCrmPaths(leadId);
}

export async function addLeadNote(formData: FormData) {
  const organisationContext = await requirePilotContext();
  const leadId = getRequiredLeadId(formData);
  const note = String(formData.get('note') || '').trim();

  if (!note) {
    throw new Error('Note cannot be empty');
  }

  if (note.length > 3000) {
    throw new Error('Note must be 3000 characters or fewer');
  }

  await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id: leadId }),
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
        characterCount: note.length,
        organisationId: organisationContext.organisationId
      }
    });
  });

  revalidateLeadCrmPaths(leadId);
}

export async function updateLeadDocumentStatus(formData: FormData) {
  const organisationContext = await requirePilotContext();
  const leadId = getRequiredLeadId(formData);
  const documentId = getRequiredDocumentId(formData);
  const nextStatus = String(formData.get('status') || '').trim();

  if (!isLeadDocumentStatus(nextStatus)) {
    throw new Error('Invalid document status');
  }

  const portalToken = await prisma.$transaction(async (tx) => {
    const existingDocument = await tx.leadDocument.findFirst({
      where: leadDocumentOrganisationWhere(organisationContext, {
        id: documentId,
        leadId
      }),
      select: {
        id: true,
        leadId: true,
        type: true,
        fileName: true,
        originalFilename: true,
        status: true,
        lead: {
          select: {
            portalToken: true
          }
        }
      }
    });

    if (!existingDocument || existingDocument.leadId !== leadId) {
      throw new Error('Document not found for this lead');
    }

    await tx.leadDocument.update({
      where: { id: documentId },
      data: {
        status: nextStatus
      }
    });

    await tx.leadActivity.create({
      data: {
        leadId,
        type: getDocumentActivityType(nextStatus as LeadDocumentStatus),
        title: `Document ${getDocumentStatusLabel(nextStatus).toLowerCase()}`,
        description: `${getDocumentTypeLabel(existingDocument.type)}: ${existingDocument.originalFilename || existingDocument.fileName}`,
        metadata: {
          documentId,
          documentType: existingDocument.type,
          previousStatus: existingDocument.status,
          nextStatus
        },
        createdBy: 'Installer dashboard',
        createdByRole: 'INSTALLER'
      }
    });

    await writeAuditLog(tx, {
      leadId,
      action: 'lead_document.status_updated',
      actor: 'admin',
      metadata: {
        documentId,
        documentType: existingDocument.type,
        previousStatus: existingDocument.status,
        nextStatus,
        organisationId: organisationContext.organisationId
      }
    });

    return existingDocument.lead.portalToken;
  });

  revalidateLeadCrmPaths(leadId, portalToken);
}

export async function regenerateLeadPortalTokenAction(formData: FormData) {
  const organisationContext = await requirePilotContext();
  const leadId = getRequiredLeadId(formData);
  await requireLeadInOrganisation(prisma, organisationContext, leadId);
  const updatedLead = await regenerateLeadPortalToken(leadId);

  revalidateLeadCrmPaths(leadId, updatedLead.portalToken);
}
