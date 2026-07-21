import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import { requirePilotContext } from '@/lib/pilot-auth';
import { leadOrganisationWhere } from '@/lib/lead-access';
import { getDashboardMetrics } from '@/lib/dashboard-metrics';
import { pricingConfig } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const organisationContext = await requirePilotContext();
  const leads = await prisma.lead.findMany({
    where: leadOrganisationWhere(organisationContext),
    select: {
      county: true,
      eircode: true,
      status: true,
      worksStarted: true,
      priorSolarGrantAtMprn: true,
      likelyEligible: true,
      pipelineStage: true,
      leadScore: true,
      documents: { select: { id: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const metrics = getDashboardMetrics(leads);
  const supportEmail = 'support@emeraldsolutions.ie';

  return (
    <DashboardShell
      userName={organisationContext.userName}
      organisationName={organisationContext.organisationName}
      role={organisationContext.pilotRole}
      activeNavItem="Support"
      sidebar={
        <SidebarMetrics
          openBlockers={metrics.openBlockers}
          eligibilityConcerns={metrics.eligibilityConcerns}
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

      <section className="installer-support-card-grid">
        <div className="installer-panel installer-support-panel">
          <div className="installer-panel-header">
            <h2>Contact Support</h2>
          </div>
          <div className="installer-support-body">
            <p>{pricingConfig.support.earlyClientSupport} {pricingConfig.support.liveWorkflowBugs}</p>
            <a href={`mailto:${supportEmail}`} className="installer-add-button support-email-button">Email Support</a>
          </div>
        </div>

        <div className="installer-panel installer-support-panel">
          <div className="installer-panel-header">
            <h2>Workflow Help</h2>
          </div>
          <div className="installer-support-body">
            <p>
              For a lead issue, include the homeowner name, lead status, and what changed before the problem appeared.
            </p>
          </div>
        </div>

        <div className="installer-panel installer-support-panel">
          <div className="installer-panel-header">
            <h2>Quote Pricing Help</h2>
          </div>
          <div className="installer-support-body">
            <p>
              For quote pricing issues, include the saved pricing values, expected quote total, and the affected lead.
            </p>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
