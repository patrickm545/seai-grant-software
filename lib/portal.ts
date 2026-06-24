import { randomBytes } from 'crypto';
import type { LeadDocument, LeadPipelineStage, LeadStatus, Prisma } from '@prisma/client';
import { writeAuditLog } from './audit';
import { buildDocumentChecklist } from './documents';
import { prisma } from './prisma';

const PORTAL_ACCESS_ACTIVITY_WINDOW_MS = 6 * 60 * 60 * 1000;

export const customerPortalStages = [
  'Enquiry Received',
  'Documents Needed',
  'Documents Submitted',
  'Review in Progress',
  'Survey Scheduled',
  'Quote Prepared',
  'Installation Scheduled',
  'Installation Complete',
  'Grant Submitted',
  'Project Complete'
] as const;

type PortalLeadSource = {
  status: LeadStatus | string;
  pipelineStage: LeadPipelineStage | string;
};

type PortalDocumentSource = Pick<LeadDocument, 'id' | 'type' | 'fileName' | 'originalFilename' | 'mimeType' | 'sizeBytes' | 'uploadedByRole' | 'status' | 'createdAt'>;

export function createPortalToken() {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function buildPortalUrl(token: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const origin = (configuredOrigin || vercelOrigin).replace(/\/+$/, '');

  return origin ? `${origin}/portal/${token}` : `/portal/${token}`;
}

function documentCountsAsSubmitted(status: string | null | undefined) {
  return status !== 'REJECTED' && status !== 'NEEDS_REPLACEMENT';
}

export function getPortalDocumentSummary(documents: PortalDocumentSource[]) {
  const checklist = buildDocumentChecklist(documents);
  const requiredItems = checklist.filter((item) => item.required);
  const missingItems = requiredItems.filter((item) => !item.latestDocument || !documentCountsAsSubmitted(item.latestDocument.status));
  const approvedItems = requiredItems.filter((item) => item.latestDocument?.status === 'APPROVED');

  return {
    checklist,
    requiredCount: requiredItems.length,
    missingCount: missingItems.length,
    approvedCount: approvedItems.length,
    submittedCount: requiredItems.length - missingItems.length,
    documentsSubmitted: missingItems.length === 0
  };
}

export function getCustomerPortalProgress(lead: PortalLeadSource, documents: PortalDocumentSource[]) {
  const documentSummary = getPortalDocumentSummary(documents);
  let currentIndex = documentSummary.documentsSubmitted ? 2 : 1;

  if (lead.status === 'NEEDS_REVIEW' || lead.status === 'READY_TO_APPLY' || lead.status === 'HOMEOWNER_REVIEW_PENDING' || lead.pipelineStage === 'QUALIFIED') {
    currentIndex = Math.max(currentIndex, 3);
  }

  if (lead.pipelineStage === 'SURVEY_BOOKED' || lead.pipelineStage === 'SURVEY_COMPLETED') {
    currentIndex = Math.max(currentIndex, 4);
  }

  if (lead.pipelineStage === 'QUOTE_SENT' || lead.pipelineStage === 'WON') {
    currentIndex = Math.max(currentIndex, 5);
  }

  if (lead.status === 'INSTALLATION_PENDING' || lead.pipelineStage === 'WON') {
    currentIndex = Math.max(currentIndex, 6);
  }

  if (lead.status === 'PAYMENT_DOCS_PENDING') {
    currentIndex = Math.max(currentIndex, 7);
  }

  if (lead.status === 'SUBMITTED') {
    currentIndex = Math.max(currentIndex, 8);
  }

  if (lead.status === 'COMPLETED') {
    currentIndex = customerPortalStages.length - 1;
  }

  return {
    documentSummary,
    currentIndex,
    currentLabel: customerPortalStages[currentIndex],
    stages: customerPortalStages.map((label, index) => ({
      label,
      state: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming'
    }))
  };
}

async function writePortalTokenEvent(
  tx: Prisma.TransactionClient,
  leadId: string,
  input: {
    type: 'PORTAL_TOKEN_CREATED' | 'PORTAL_TOKEN_REGENERATED';
    title: string;
    actor: string;
  }
) {
  await tx.leadActivity.create({
    data: {
      leadId,
      type: input.type,
      title: input.title,
      description: 'A secure customer portal link is available for this homeowner.',
      metadata: {
        source: 'customer_portal'
      },
      createdBy: input.actor,
      createdByRole: 'INSTALLER'
    }
  });

  await writeAuditLog(tx, {
    leadId,
    action: input.type === 'PORTAL_TOKEN_CREATED' ? 'portal.token_created' : 'portal.token_regenerated',
    actor: 'admin',
    metadata: {
      source: 'installer_dashboard'
    }
  });
}

export async function ensureLeadPortalToken(leadId: string) {
  const existingLead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      portalToken: true,
      portalTokenCreatedAt: true,
      portalLastAccessedAt: true
    }
  });

  if (!existingLead) {
    throw new Error('Lead not found');
  }

  if (existingLead.portalToken && existingLead.portalTokenCreatedAt) {
    return existingLead;
  }

  const now = new Date();
  const portalToken = createPortalToken();

  return prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        portalToken,
        portalTokenCreatedAt: now
      },
      select: {
        id: true,
        portalToken: true,
        portalTokenCreatedAt: true,
        portalLastAccessedAt: true
      }
    });

    await writePortalTokenEvent(tx, leadId, {
      type: 'PORTAL_TOKEN_CREATED',
      title: 'Customer portal link created',
      actor: 'Installer dashboard'
    });

    return updatedLead;
  });
}

export async function regenerateLeadPortalToken(leadId: string) {
  const now = new Date();
  const portalToken = createPortalToken();

  return prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        portalToken,
        portalTokenCreatedAt: now
      },
      select: {
        id: true,
        portalToken: true,
        portalTokenCreatedAt: true,
        portalLastAccessedAt: true
      }
    });

    await writePortalTokenEvent(tx, leadId, {
      type: 'PORTAL_TOKEN_REGENERATED',
      title: 'Customer portal link regenerated',
      actor: 'Installer dashboard'
    });

    return updatedLead;
  });
}

export async function markPortalAccessed(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      portalLastAccessedAt: true
    }
  });

  if (!lead) return;

  const now = new Date();
  const shouldWriteActivity =
    !lead.portalLastAccessedAt ||
    now.getTime() - lead.portalLastAccessedAt.getTime() > PORTAL_ACCESS_ACTIVITY_WINDOW_MS;

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        portalLastAccessedAt: now
      }
    });

    if (!shouldWriteActivity) return;

    await tx.leadActivity.create({
      data: {
        leadId,
        type: 'PORTAL_ACCESSED',
        title: 'Customer portal accessed',
        description: 'The homeowner opened their secure project portal.',
        metadata: {
          accessedAt: now.toISOString()
        },
        createdBy: 'Customer portal',
        createdByRole: 'HOMEOWNER'
      }
    });

    await writeAuditLog(tx, {
      leadId,
      action: 'portal.accessed',
      actor: 'homeowner',
      metadata: {
        accessedAt: now.toISOString()
      }
    });
  });
}
