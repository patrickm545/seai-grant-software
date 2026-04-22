import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/StatCard';
import { getDefaultInstallerSeedData } from '@/lib/default-installer';

const ADMIN_BASE_PATH = '/admin/dashboard';
export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  NEEDS_REVIEW: 'Needs review',
  READY_TO_APPLY: 'Ready to apply',
  HOMEOWNER_REVIEW_PENDING: 'Waiting on homeowner',
  SUBMITTED: 'Submitted',
  INSTALLATION_PENDING: 'Installation pending',
  PAYMENT_DOCS_PENDING: 'Payment docs pending',
  COMPLETED: 'Completed'
};

function getStatusTone(status: string) {
  if (status === 'READY_TO_APPLY' || status === 'SUBMITTED' || status === 'COMPLETED') return 'success';
  if (status === 'NEEDS_REVIEW') return 'danger';
  if (status === 'HOMEOWNER_REVIEW_PENDING' || status === 'PAYMENT_DOCS_PENDING' || status === 'INSTALLATION_PENDING') {
    return 'warning';
  }

  return 'default';
}

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

function getLeadTempTone(temp: string | null) {
  if (temp === 'HOT') return 'success';
  if (temp === 'COLD') return 'danger';
  return 'warning';
}

export default async function HiddenAdminPage() {
  const defaultInstaller = getDefaultInstallerSeedData();
  const leads: any[] = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { installer: true, documents: true }
  });

  const total = leads.length;
  const review = leads.filter((lead) => lead.status === 'NEEDS_REVIEW' || lead.status === 'HOMEOWNER_REVIEW_PENDING').length;
  const submitted = leads.filter((lead) => lead.status === 'SUBMITTED').length;
  const hotLeads = leads.filter((lead) => getSalesSignal(lead.structuredExportJson)?.leadTemperature === 'HOT').length;
  const highRisk = leads.filter((lead) => lead.worksStarted || lead.likelyEligible === false).length;
  const statusCounts = leads.reduce<Record<string, number>>((acc: Record<string, number>, lead: any) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
  const urgentLeads = leads
    .filter((lead) => lead.status === 'NEEDS_REVIEW' || lead.worksStarted || lead.likelyEligible === false || getSalesSignal(lead.structuredExportJson)?.leadTemperature === 'HOT')
    .slice(0, 5);

  return (
    <main className="container grid admin-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="admin-topbar"><div className="badge">Installer dashboard</div><Link href="/admin/logout" className="small">Log out</Link></div>
          <h1>SEAI grant leads with built-in sales priority</h1>
          <p className="hero-text">
            See which homeowners look grant-ready, which ones need manual review, and which hot leads should get a callback first.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-chip">
            <span className="metric-label">Installer</span>
            <strong>{defaultInstaller.name}</strong>
          </div>
          <div className="metric-chip">
            <span className="metric-label">Tracked counties</span>
            <strong>{new Set(leads.map((lead) => lead.county)).size}</strong>
          </div>
          <div className="metric-chip">
            <span className="metric-label">Open blockers</span>
            <strong>{highRisk}</strong>
          </div>
        </div>
      </section>

      <section className="grid grid-4">
        <StatCard title="Active leads" value={total} subtext="Live homeowner pipeline" />
        <StatCard title="Hot leads" value={hotLeads} subtext="Call these first" tone="success" />
        <StatCard title="Needs attention" value={review} subtext="Manual review or homeowner confirmation" tone="warning" />
        <StatCard title="Submitted" value={submitted} subtext="Moved beyond intake" />
      </section>

      <section className="dashboard-grid">
        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Queue overview</div>
              <h2>Lead status mix</h2>
            </div>
          </div>
          <div className="status-stack">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="status-row">
                <div className="status-row-main">
                  <span className={`status-pill status-pill-${getStatusTone(status)}`}>{STATUS_LABELS[status] ?? status}</span>
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Priority queue</div>
              <h2>Call first</h2>
            </div>
          </div>
          <div className="priority-list">
            {urgentLeads.map((lead) => {
              const salesSignal = getSalesSignal(lead.structuredExportJson);
              const leadTemperature = typeof salesSignal?.leadTemperature === 'string' ? salesSignal.leadTemperature : 'WARM';
              const installTimeline = typeof salesSignal?.installTimeline === 'string' ? salesSignal.installTimeline : 'Timeline unknown';

              return (
                <Link key={lead.id} href={`${ADMIN_BASE_PATH}/leads/${lead.id}`} className="priority-item">
                  <div>
                    <strong>{lead.fullName}</strong>
                    <div className="small">{lead.county} • {lead.email}</div>
                    <div className="small">{installTimeline.replaceAll('_', ' ')}</div>
                  </div>
                  <div className="priority-badges">
                    <span className={`status-pill status-pill-${getLeadTempTone(leadTemperature)}`}>{leadTemperature}</span>
                    <span className={`status-pill status-pill-${getStatusTone(lead.status)}`}>{STATUS_LABELS[lead.status]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Pipeline table</div>
            <h2>Recent leads</h2>
          </div>
          <div className="small">Showing the latest 50 homeowner records</div>
        </div>
        <div className="table-wrap">
          <table className="table lead-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Status</th>
                <th>Sales signal</th>
                <th>Eligibility</th>
                <th>Docs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const salesSignal = getSalesSignal(lead.structuredExportJson);
                const leadTemperature = typeof salesSignal?.leadTemperature === 'string' ? salesSignal.leadTemperature : 'WARM';
                const installTimeline = typeof salesSignal?.installTimeline === 'string' ? salesSignal.installTimeline : 'No timeline yet';

                return (
                  <tr key={lead.id}>
                    <td>
                      <div className="lead-primary">
                        <strong>{lead.fullName}</strong>
                        <div className="small">{lead.email}</div>
                        <div className="small">{lead.county} • {lead.eircode || 'No Eircode yet'}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill status-pill-${getStatusTone(lead.status)}`}>{STATUS_LABELS[lead.status]}</span>
                    </td>
                    <td>
                      <div className="lead-eligibility">
                        <span className={`status-pill status-pill-${getLeadTempTone(leadTemperature)}`}>{leadTemperature}</span>
                        <div className="small">{installTimeline.replaceAll('_', ' ')}</div>
                      </div>
                    </td>
                    <td>
                      <div className="lead-eligibility">
                        <strong>{lead.likelyEligible === null ? 'Pending' : lead.likelyEligible ? 'Likely eligible' : 'Needs review'}</strong>
                        <div className="small">
                          {lead.eligibilityConfidence === null ? 'No confidence score yet' : `${Math.round(lead.eligibilityConfidence * 100)}% confidence`}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="small">{lead.documents.length} upload{lead.documents.length === 1 ? '' : 's'}</div>
                    </td>
                    <td>
                      <Link href={`${ADMIN_BASE_PATH}/leads/${lead.id}`} className="table-link">Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
