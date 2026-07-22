'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { LeadWorkspaceViewModel } from '@/lib/lead-workspace';

const sections = [
  { label: 'Overview', segment: '' },
  { label: 'Documents', segment: 'documents' },
  { label: 'Activity', segment: 'activity' },
  { label: 'Tasks', segment: 'tasks' },
  { label: 'Notes', segment: 'notes' }
] as const;

export function LeadWorkspaceShell({ lead, children }: { lead: LeadWorkspaceViewModel; children: ReactNode }) {
  const pathname = usePathname();
  const basePath = `/installer-review-emerald/leads/${lead.id}`;

  return (
    <main className="lead-workspace" id="main-content">
      <div className="lead-workspace-bar">
        <Link href="/installer-review-emerald/leads" className="lead-workspace-back">← Back to leads</Link>
        <button type="button" className="lead-workspace-new-lead" aria-disabled="true" aria-describedby="new-lead-help">New Lead</button>
        <span id="new-lead-help" className="visually-hidden">Manual lead creation is coming in the next approved release step.</span>
      </div>

      <header className="lead-workspace-summary">
        <div className="lead-workspace-identity">
          <div className="eyebrow">Lead workspace</div>
          <h1>{lead.customerName}</h1>
          <p>{lead.location}</p>
          <div className="lead-workspace-contact-actions" aria-label="Contact actions">
            {lead.phone ? <a href={`tel:${lead.phone}`}>Call {lead.phone}</a> : <span>Phone unavailable</span>}
            {lead.email ? <a href={`mailto:${lead.email}`}>Email {lead.email}</a> : <span>Email unavailable</span>}
          </div>
        </div>
        <dl className="lead-workspace-context">
          <div>
            <dt>Workflow stage</dt>
            <dd><span className={`status-pill status-pill-${lead.stage.tone}`}>{lead.stage.label}</span></dd>
          </div>
          <div>
            <dt>Readiness</dt>
            <dd><strong>{lead.readiness.label}</strong><span>{lead.readiness.detail}</span></dd>
          </div>
          <div>
            <dt>Assigned owner</dt>
            <dd><strong>{lead.ownerLabel}</strong></dd>
          </div>
          <div>
            <dt>{lead.nextAction.label}</dt>
            <dd><strong>{lead.nextAction.detail}</strong></dd>
          </div>
        </dl>
      </header>

      <nav className="lead-workspace-nav" aria-label={`Sections for ${lead.customerName}`}>
        {sections.map((section) => {
          const href = section.segment ? `${basePath}/${section.segment}` : basePath;
          const active = section.segment ? pathname === href : pathname === basePath;
          return <Link key={section.label} href={href} aria-current={active ? 'page' : undefined}>{section.label}</Link>;
        })}
      </nav>

      <div className="lead-workspace-content">{children}</div>
    </main>
  );
}
