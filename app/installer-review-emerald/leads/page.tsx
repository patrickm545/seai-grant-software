import type { Prisma } from '@prisma/client';
import { updateLeadPipelineStage } from '@/app/installer-review-emerald/actions';
import { DashboardShell } from '@/components/DashboardShell';
import { RecentLeadsTable, type RecentDashboardLead } from '@/components/RecentLeadsTable';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import type { LeadPipelineStageValue, LeadScoreValue } from '@/lib/crm';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_LEAD_BASE_PATH = '/installer-review-emerald/leads';

type LeadsPageLead = Prisma.LeadGetPayload<{
  include: { documents: true; activities: true };
}>;

function isNeedsAction(lead: LeadsPageLead) {
  return (
    lead.status === 'NEEDS_REVIEW' ||
    lead.status === 'HOMEOWNER_REVIEW_PENDING' ||
    lead.worksStarted ||
    lead.likelyEligible === false
  );
}

function isLiabilityLead(lead: LeadsPageLead) {
  return lead.worksStarted || lead.priorSolarGrantAtMprn || lead.likelyEligible === false;
}

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
  const leads: LeadsPageLead[] = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      documents: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  const trackedCounties = new Set(leads.map((lead) => lead.county).filter(Boolean)).size;
  const openBlockers = leads.filter(isNeedsAction).length;
  const liabilityLeads = leads.filter(isLiabilityLead).length;
  const userName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Patrick McKenna';

  return (
    <DashboardShell
      userName={userName}
      activeNavItem="Leads"
      sidebar={
        <SidebarMetrics
          trackedCounties={trackedCounties || 6}
          openBlockers={openBlockers}
          liabilityLeads={liabilityLeads}
        />
      }
    >
      <div className="installer-dashboard-heading">
        <div>
          <div className="eyebrow">Clada OS CRM</div>
          <h1>Leads</h1>
          <p className="small">Open homeowner records, update sales stages, review scores, and manage grant-readiness workflow.</p>
        </div>
        <a href="/embed" className="installer-add-button">Open intake</a>
      </div>

      <RecentLeadsTable
        leads={leads.map(toRecentLead)}
        basePath={ADMIN_LEAD_BASE_PATH}
        updateStageAction={updateLeadPipelineStage}
        title="All Leads"
        subtitle={`Showing ${leads.length} homeowner record${leads.length === 1 ? '' : 's'}`}
      />
    </DashboardShell>
  );
}
