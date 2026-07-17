import Link from 'next/link';

type SidebarMetricsProps = {
  openBlockers: number;
  eligibilityConcerns: number;
};

export function SidebarMetrics({ openBlockers, eligibilityConcerns }: SidebarMetricsProps) {
  return (
    <aside className="installer-sidebar" aria-label="Dashboard summary">
      <Link href="/admin/dashboard" className="installer-sidebar-nav installer-sidebar-nav-active">
        <span aria-hidden="true">D</span>
        Dashboard
      </Link>

      <div className="sidebar-metric-group">
        <div className="sidebar-metric sidebar-metric-warning">
          <span>Open Blockers</span>
          <strong>{openBlockers}</strong>
        </div>
        <div className="sidebar-metric">
          <span>Eligibility Concerns</span>
          <strong>{eligibilityConcerns}</strong>
        </div>
      </div>
    </aside>
  );
}
