import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { RoiCalculator } from '@/components/RoiCalculator';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import { formatEuroAmount, pricingConfig } from '@/lib/pricing';
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

const objections = [
  {
    prompt: 'We already have a CRM',
    response:
      'SOLARgrant is not trying to replace the CRM. It sits before or beside it as the SEAI grant-readiness layer: pre-qualifying homeowners, collecting MPRN/property details, and reducing paperwork bottlenecks before the lead reaches sales.'
  },
  {
    prompt: "Is my customers' data safe?",
    response:
      'The product is built with GDPR-conscious controls: explicit consent, admin-only review routes, audit logs for core workflow actions, and an erase-record action for deletion requests. Formal legal policies and a DPA still need review before scale.'
  },
  {
    prompt: 'What happens if the software goes down?',
    response:
      'Early clients get direct founding-team support, and bugs affecting live workflows are handled quickly. Enterprise SLA and uptime guarantees are planned later once monitoring and support operations are formalised.'
  },
  {
    prompt: "We're too small for this",
    response:
      'Small teams feel grant admin pain fastest. SOLARgrant helps keep incomplete grant details, follow-up dates, and ready-to-apply leads visible without hiring another admin.'
  },
  {
    prompt: 'The price is too high',
    response:
      `The base software price is around ${formatEuroAmount(pricingConfig.baseSoftwarePriceEur)}. One converted solar job can cover the subscription, and early installers can use the website offer to reduce launch friction.`
  }
];

export default async function SalesPlaybookPage() {
  const leads = await prisma.lead.findMany({
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
  const userName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Patrick McKenna';

  return (
    <DashboardShell
      userName={userName}
      activeNavItem="Sales Playbook"
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
          <h1>Internal Sales Playbook</h1>
          <p className="small">SOLARgrant Commercial Readiness</p>
        </div>
        <Link href="/admin/dashboard" className="installer-add-button">Back to Dashboard</Link>
      </div>

      <section className="installer-panel sales-playbook-panel">
        <div className="installer-panel-header">
          <h2>Positioning</h2>
        </div>
        <div className="sales-playbook-body">
          <h3>Purpose-built for Irish SEAI grant workflows</h3>
          <p>
            SOLARgrant is not a generic CRM. It helps installers pre-qualify homeowner leads, manage grant readiness,
            prepare manual submission details, and reduce paperwork bottlenecks.
          </p>
        </div>
      </section>

      <section className="sales-playbook-grid">
        <div className="installer-panel sales-playbook-panel">
          <div className="installer-panel-header">
            <h2>Pricing Foundation</h2>
          </div>
          <div className="sales-playbook-detail-list">
            <div><span>Base software</span><strong>{formatEuroAmount(pricingConfig.baseSoftwarePriceEur)}</strong></div>
            <div>
              <span>Website maintenance</span>
              <strong>
                {formatEuroAmount(pricingConfig.maintenanceMonthlyRangeEur.min)}-
                {formatEuroAmount(pricingConfig.maintenanceMonthlyRangeEur.max)}/month
              </strong>
            </div>
            <div><span>Early website offer</span><strong>{pricingConfig.earlyClientWebsiteOffer.clientRange}</strong></div>
            <div><span>Future premium</span><strong>{pricingConfig.futureOffers.join(', ')}</strong></div>
          </div>
        </div>
        <RoiCalculator />
      </section>

      <section className="installer-panel sales-playbook-panel">
        <div className="installer-panel-header">
          <h2>Objection Handling</h2>
        </div>
        <div className="sales-playbook-objection-grid">
          {objections.map((item) => (
            <article key={item.prompt} className="sales-playbook-card">
              <h3>{item.prompt}</h3>
              <p>{item.response}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-playbook-card-grid">
        <div className="installer-panel sales-playbook-panel">
          <div className="installer-panel-header">
            <h2>Trust and Compliance</h2>
          </div>
          <div className="sales-playbook-body">
            <p>
              Built with GDPR-conscious controls, explicit homeowner consent, audit logging, and admin-only workflow access.
              Do not claim full GDPR compliance until legal policies and processor terms are reviewed.
            </p>
          </div>
        </div>
        <div className="installer-panel sales-playbook-panel">
          <div className="installer-panel-header">
            <h2>Support</h2>
          </div>
          <div className="sales-playbook-body">
            <p>{pricingConfig.support.earlyClientSupport} {pricingConfig.support.liveWorkflowBugs}</p>
          </div>
        </div>
        <div className="installer-panel sales-playbook-panel">
          <div className="installer-panel-header">
            <h2>Website Strategy</h2>
          </div>
          <div className="sales-playbook-body">
            <p>
              Free websites are template-based, limited to early clients, and secondary to the core grant workflow software.
              Maintenance can be offered separately after launch.
            </p>
          </div>
        </div>
      </section>

      <section className="installer-panel sales-playbook-panel">
        <div className="installer-panel-header">
          <h2>SLA and Uptime</h2>
        </div>
        <div className="sales-playbook-body">
          <p>
            Formal SLA, uptime guarantees, incident response targets, and enterprise support terms should be introduced only
            after monitoring, alerting, and support coverage are in place.
          </p>
        </div>
      </section>
    </DashboardShell>
  );
}
