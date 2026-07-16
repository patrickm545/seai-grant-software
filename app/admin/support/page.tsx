import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import { requirePilotContext } from '@/lib/pilot-auth';
import { leadOrganisationWhere } from '@/lib/lead-access';
import { pricingConfig } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isNeedsAction(lead: { status: string; worksStarted: boolean; likelyEligible: boolean | null }) {
  return (
    lead.status === 'NEEDS_REVIEW' ||
    lead.status === 'HOMEOWNER_REVIEW_PENDING' ||
    lead.worksStarted ||
    lead.likelyEligible === false
  );
}

function isLiabilityLead(lead: { worksStarted: boolean; priorSolarGrantAtMprn: boolean; likelyEligible: boolean | null }) {
  return lead.worksStarted || lead.priorSolarGrantAtMprn || lead.likelyEligible === false;
}

export default async function SupportPage() {
  const organisationContext = await requirePilotContext();
  const leads = await prisma.lead.findMany({
    where: leadOrganisationWhere(organisationContext),
    select: {
      county: true,
      status: true,
      worksStarted: true,
      priorSolarGrantAtMprn: true,
      likelyEligible: true
    },
    take: 50,
    orderBy: { createdAt: 'desc' }
  });

  const trackedCounties = new Set(leads.map((lead) => lead.county).filter(Boolean)).size;
  const openBlockers = leads.filter(isNeedsAction).length;
  const liabilityLeads = leads.filter(isLiabilityLead).length;
  const supportEmail = 'support@emeraldsolutions.ie';

  return (
    <DashboardShell
      userName={organisationContext.userName}
      organisationName={organisationContext.organisationName}
      role={organisationContext.pilotRole}
      activeNavItem="Support"
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
          <h1>Support</h1>
          <p className="small">Get help with live workflows, grant-readiness reviews, and dashboard setup.</p>
        </div>
        <Link href="/admin/dashboard" className="installer-add-button">Back to Dashboard</Link>
      </div>

      <section className="sales-playbook-card-grid">
        <div className="installer-panel sales-playbook-panel">
          <div className="installer-panel-header">
            <h2>Contact Support</h2>
          </div>
          <div className="sales-playbook-body">
            <p>{pricingConfig.support.earlyClientSupport} {pricingConfig.support.liveWorkflowBugs}</p>
            <a href={`mailto:${supportEmail}`} className="installer-add-button support-email-button">Email Support</a>
          </div>
        </div>

        <div className="installer-panel sales-playbook-panel">
          <div className="installer-panel-header">
            <h2>Workflow Help</h2>
          </div>
          <div className="sales-playbook-body">
            <p>
              For a lead issue, include the homeowner name, lead status, and what changed before the problem appeared.
            </p>
          </div>
        </div>

        <div className="installer-panel sales-playbook-panel">
          <div className="installer-panel-header">
            <h2>Quote Pricing Help</h2>
          </div>
          <div className="sales-playbook-body">
            <p>
              For quote pricing issues, include the saved pricing values, expected quote total, and the affected lead.
            </p>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
