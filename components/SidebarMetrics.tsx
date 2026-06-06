import Link from 'next/link';

type SidebarMetricsProps = {
  trackedCounties: number;
  openBlockers: number;
  liabilityLeads: number;
};

export function SidebarMetrics({ trackedCounties, openBlockers, liabilityLeads }: SidebarMetricsProps) {
  return (
    <aside className="installer-sidebar" aria-label="Dashboard summary">
      <Link href="/admin/dashboard" className="installer-sidebar-nav installer-sidebar-nav-active">
        <span aria-hidden="true">D</span>
        Dashboard
      </Link>

      <div className="sidebar-metric-group">
        <div className="sidebar-metric">
          <span>Tracked Counties</span>
          <strong>{trackedCounties}</strong>
        </div>
        <div className="sidebar-metric sidebar-metric-warning">
          <span>Open Blockers</span>
          <strong>{openBlockers}</strong>
        </div>
        <div className="sidebar-metric">
          <span>Liability Leads</span>
          <strong>{liabilityLeads || '-'}</strong>
        </div>
      </div>
    </aside>
  );
}
