import type { Prisma, PrismaClient } from '@prisma/client';
import type { OrganisationContext } from './identity';
import { getPipelineStageLabel, getPipelineStageTone } from './crm';
import { leadOrganisationWhere } from './lead-access';
import { requirePermission } from './permissions';
import { getSolarGrantJurisdictionViewState } from './solargrant-jurisdiction-safe-view';
import { getLeadQualificationSummary } from './lead-qualification';

type DbClient = PrismaClient | Prisma.TransactionClient;

export type LeadWorkspaceViewModel = {
  id: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  location: string;
  origin: {
    label: string;
    detail: string;
  };
  stage: {
    key: string;
    label: string;
    tone: string;
  };
  readiness: {
    label: string;
    detail: string;
    tone: 'default' | 'success' | 'warning';
  };
  ownerLabel: string;
  nextAction: {
    label: string;
    detail: string;
  };
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(value);
}

export function describeLeadNextAction(
  nextFollowUpAt: Date | null,
  followUpDate: Date | null,
  now = new Date()
) {
  const followUpAt = nextFollowUpAt ?? followUpDate;
  if (!followUpAt) {
    return {
      label: 'No follow-up scheduled',
      detail: 'Set a follow-up from the Overview when the next contact is known.'
    };
  }

  const overdue = followUpAt.getTime() < now.getTime();
  return {
    label: overdue ? 'Follow-up overdue' : 'Next follow-up',
    detail: `${overdue ? 'Due' : 'Scheduled for'} ${formatDate(followUpAt)}`
  };
}

export async function getLeadWorkspaceViewModel(args: {
  db: DbClient;
  context: OrganisationContext | null | undefined;
  leadId: string;
  now?: Date;
}): Promise<LeadWorkspaceViewModel | null> {
  const { db, context, leadId, now = new Date() } = args;
  requirePermission(context, 'lead.read');

  const lead = await db.lead.findFirst({
    where: leadOrganisationWhere(context, { id: leadId }),
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      county: true,
      eircode: true,
      pipelineStage: true,
      likelyEligible: true,
      nextFollowUpAt: true,
      followUpDate: true,
      creationOrigin: true,
      addressLine1: true,
      propertyOwner: true,
      privateLandlord: true,
      dwellingType: true,
      yearBuilt: true,
      mprn: true,
      worksStarted: true,
      priorSolarGrantAtMprn: true,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: true,
      structuredExportJson: true,
      generatedQuoteJson: true,
      assignedMembership: {
        select: {
          status: true,
          user: { select: { displayName: true } }
        }
      }
    }
  });

  if (!lead) return null;

  const jurisdiction = getSolarGrantJurisdictionViewState(lead);
  const qualification = getLeadQualificationSummary(lead);
  const readiness = !qualification.readiness.allowed
    ? {
        label: 'Qualification incomplete',
        detail: lead.creationOrigin === 'MANUAL_INSTALLER'
          ? 'Installer-entered enquiry. Eligibility, homeowner consent, and grant readiness have not been established.'
          : 'Required qualification or consent facts are not yet verified.',
        tone: 'warning' as const
      }
    : !jurisdiction.canPresentSeaiConclusions
    ? { label: jurisdiction.label, detail: jurisdiction.message ?? 'Location must be reviewed.', tone: 'warning' as const }
    : lead.likelyEligible === true
      ? { label: 'Eligibility assessment recorded', detail: 'Likely eligible, subject to the existing SEAI review process.', tone: 'success' as const }
      : lead.likelyEligible === false
        ? { label: 'Eligibility review required', detail: 'The existing assessment needs review.', tone: 'warning' as const }
        : { label: 'Eligibility not yet recorded', detail: 'No eligibility conclusion is available.', tone: 'default' as const };
  return {
    id: lead.id,
    customerName: lead.fullName,
    email: lead.email || null,
    phone: lead.phone || null,
    location: [lead.county, lead.eircode].filter(Boolean).join(' / ') || 'Location not recorded',
    origin: lead.creationOrigin === 'MANUAL_INSTALLER'
      ? { label: 'Manually entered', detail: 'Recorded by an authenticated installer.' }
      : lead.creationOrigin === 'HOMEOWNER_INTAKE'
        ? { label: 'Homeowner intake', detail: 'Submitted through the homeowner qualification journey.' }
        : { label: 'Legacy origin', detail: 'The historical creation path is not known.' },
    stage: {
      key: lead.pipelineStage,
      label: getPipelineStageLabel(lead.pipelineStage),
      tone: getPipelineStageTone(lead.pipelineStage)
    },
    readiness,
    ownerLabel: lead.assignedMembership
      ? `${lead.assignedMembership.user.displayName}${lead.assignedMembership.status === 'ACTIVE' ? '' : ' (inactive)'}`
      : 'Unassigned',
    nextAction: describeLeadNextAction(lead.nextFollowUpAt, lead.followUpDate, now)
  };
}
