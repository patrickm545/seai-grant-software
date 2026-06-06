import type { Prisma } from '@prisma/client';
import { DashboardShell } from '@/components/DashboardShell';
import { RecentLeadsTable, type RecentDashboardLead } from '@/components/RecentLeadsTable';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_LEAD_BASE_PATH = '/installer-review-emerald/leads';

type LeadsPageLead = Prisma.LeadGetPayload<{
  include: { documents: true };
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getSalesSignal(value: unknown) {
  const root = asRecord(value);
  return asRecord(root?.salesSignal);
}

function getLeadTemperature(lead: LeadsPageLead): RecentDashboardLead['salesSignal'] {
  const value = getSalesSignal(lead.structuredExportJson)?.leadTemperature;
  return value === 'HOT' || value === 'WARM' || value === 'COLD' ? value : 'WARM';
}

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

function toRecentStatus(lead: LeadsPageLead): Pick<RecentDashboardLead, 'status' | 'statusLabel'> {
  if (lead.status === 'READY_TO_APPLY') {
    return { status: 'READY_TO_APPLY', statusLabel: 'Ready to Apply' };
  }

  if (lead.status === 'NEEDS_REVIEW' || lead.status === 'HOMEOWNER_REVIEW_PENDING' || lead.status === 'PAYMENT_DOCS_PENDING') {
    return { status: 'NEEDS_INFO', statusLabel: 'Needs Info' };
  }

  return { status: 'UNDER_REVIEW', statusLabel: 'Under Review' };
}

function toRecentLead(lead: LeadsPageLead): RecentDashboardLead {
  return {
    id: lead.id,
    applicant: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    confidence: lead.eligibilityConfidence,
    salesSignal: getLeadTemperature(lead),
    ...toRecentStatus(lead)
  };
}

export default async function InstallerLeadsPage() {
  const leads: LeadsPageLead[] = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { documents: true }
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
          <h1>Leads</h1>
          <p className="small">Open homeowner records, review documents, and manage the grant-readiness workflow.</p>
        </div>
        <a href="/embed" className="installer-add-button">Open intake</a>
      </div>

      <RecentLeadsTable
        leads={leads.map(toRecentLead)}
        basePath={ADMIN_LEAD_BASE_PATH}
        title="All Leads"
        subtitle={`Showing ${leads.length} homeowner record${leads.length === 1 ? '' : 's'}`}
      />
    </DashboardShell>
  );
}
