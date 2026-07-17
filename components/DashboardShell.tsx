import Link from 'next/link';
import type { ReactNode } from 'react';

type DashboardShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  userName: string;
  organisationName: string;
  role: string;
  activeNavItem?: string;
};

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Leads', href: '/installer-review-emerald/leads' },
  { label: 'Quote Pricing', href: '/admin/dashboard/quote-pricing' },
  { label: 'Sales Playbook', href: '/admin/sales-playbook' },
  { label: 'Support', href: '/admin/support' }
];

export function DashboardShell({
  children,
  sidebar,
  userName,
  organisationName,
  role,
  activeNavItem = 'Dashboard'
}: DashboardShellProps) {
  return (
    <div className="installer-pro-shell">
      <header className="installer-pro-topbar">
        <Link href="/admin/dashboard" className="installer-pro-brand" aria-label="Clada OS dashboard">
          <span className="installer-pro-mark" aria-hidden="true">CO</span>
          <span>
            <strong>Clada</strong>
            <em>OS</em>
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

        <div className="installer-pro-account">
          <div className="installer-pro-user">
            <strong>{userName}</strong>
            <span>{organisationName} · {role}</span>
          </div>
          <form action="/logout" method="POST">
            <button type="submit" className="installer-pro-logout">Log out</button>
          </form>
        </div>
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
