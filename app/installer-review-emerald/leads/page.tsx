import type { Prisma } from '@prisma/client';
import { updateLeadPipelineStage } from '@/app/installer-review-emerald/actions';
import { DashboardShell } from '@/components/DashboardShell';
import { RecentLeadsTable, type RecentDashboardLead } from '@/components/RecentLeadsTable';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import type { LeadPipelineStageValue, LeadScoreValue } from '@/lib/crm';
import { getDashboardMetrics } from '@/lib/dashboard-metrics';
import { requirePilotContext } from '@/lib/pilot-auth';
import { leadOrganisationWhere } from '@/lib/lead-access';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_LEAD_BASE_PATH = '/installer-review-emerald/leads';

type LeadsPageLead = Prisma.LeadGetPayload<{
  include: { documents: true; activities: true };
}>;

function getLastActivityAt(lead: LeadsPageLead) {
  return lead.activities[0]?.createdAt ?? lead.updatedAt ?? lead.createdAt;
}

function getLeadLocation(lead: Pick<LeadsPageLead, 'county' | 'eircode'>) {
  return [lead.county, lead.eircode || 'No Eircode'].filter(Boolean).join(' / ');
}

function toRecentLead(lead: LeadsPageLead): RecentDashboardLead {
  return {
    id: lead.id,
    applicant: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    location: getLeadLocation(lead),
    confidence: lead.eligibilityConfidence,
    leadScore: lead.leadScore as LeadScoreValue,
    pipelineStage: lead.pipelineStage as LeadPipelineStageValue,
    lastActivityAt: getLastActivityAt(lead).toISOString()
  };
}

export default async function InstallerLeadsPage() {
  const organisationContext = await requirePilotContext();
  const [leads, installer]: [LeadsPageLead[], { id: string } | null] = await Promise.all([
    prisma.lead.findMany({
      where: leadOrganisationWhere(organisationContext),
      orderBy: { createdAt: 'desc' },
      include: {
        documents: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    }),
    prisma.installer.findFirst({
      where: { organisationId: organisationContext.organisationId },
      select: { id: true }
    })
  ]);

  const metrics = getDashboardMetrics(leads);
  const intakePath = installer ? `/embed?installerId=${encodeURIComponent(installer.id)}` : null;
  return (
    <DashboardShell
      userName={organisationContext.userName}
      organisationName={organisationContext.organisationName}
      role={organisationContext.pilotRole}
      activeNavItem="Leads"
      sidebar={
        <SidebarMetrics
          openBlockers={metrics.openBlockers}
          eligibilityConcerns={metrics.eligibilityConcerns}
        />
      }
    >
      <div className="installer-dashboard-heading">
        <div>
          <div className="eyebrow">Clada OS CRM</div>
          <h1>Leads</h1>
          <p className="small">Open homeowner records, update sales stages, review scores, and manage grant-readiness workflow.</p>
        </div>
        {intakePath ? <a href={intakePath} className="installer-add-button">Open intake</a> : null}
      </div>

      <RecentLeadsTable
        leads={leads.map(toRecentLead)}
        basePath={ADMIN_LEAD_BASE_PATH}
        intakePath={intakePath}
        updateStageAction={updateLeadPipelineStage}
        title="All leads"
        subtitle={`Showing ${leads.length} homeowner record${leads.length === 1 ? '' : 's'}`}
      />
    </DashboardShell>
  );
}
