import Link from 'next/link';
import type { ReactNode } from 'react';

type DashboardShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  userName: string;
  activeNavItem?: string;
};

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Leads', href: '/installer-review-emerald/leads' },
  { label: 'Quote Pricing', href: '/admin/dashboard/quote-pricing' },
  { label: 'Sales Playbook', href: '/admin/sales-playbook' },
  { label: 'Support', href: '/admin/support' }
];

export function DashboardShell({ children, sidebar, userName, activeNavItem = 'Dashboard' }: DashboardShellProps) {
  return (
    <div className="installer-pro-shell">
      <header className="installer-pro-topbar">
        <Link href="/admin/dashboard" className="installer-pro-brand" aria-label="SOLARgrant dashboard">
          <span className="installer-pro-mark" aria-hidden="true">SG</span>
          <span>
            <strong>SOLARgrant</strong>
            <em>PRO</em>
          </span>
        </Link>

        <nav className="installer-pro-nav" aria-label="Installer dashboard navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={item.label === activeNavItem ? 'installer-pro-nav-active' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="installer-pro-user">Logged in as {userName}</div>
      </header>

      <div className="installer-pro-layout">
        {sidebar}
        <main className="installer-pro-main">{children}</main>
      </div>

      <Link href="/admin/support" className="installer-help-bubble" aria-label="Open support">
        ?
      </Link>
    </div>
  );
}
