'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type RecentDashboardLead = {
  id: string;
  applicant: string;
  email: string;
  phone: string | null;
  confidence: number | null;
  salesSignal: 'HOT' | 'WARM' | 'COLD';
  status: 'READY_TO_APPLY' | 'NEEDS_INFO' | 'UNDER_REVIEW';
  statusLabel: string;
  isSample?: boolean;
};

const filterOptions = [
  { label: 'All Pipelines', value: 'ALL' },
  { label: 'Ready to Apply', value: 'READY_TO_APPLY' },
  { label: 'Needs Info', value: 'NEEDS_INFO' },
  { label: 'Under Review', value: 'UNDER_REVIEW' }
] as const;

type FilterValue = (typeof filterOptions)[number]['value'];

function confidenceLabel(value: number | null) {
  return value === null ? 'Pending' : `${Math.round(value * 100)}%`;
}

function signalLabel(signal: RecentDashboardLead['salesSignal']) {
  if (signal === 'HOT') return 'Hot';
  if (signal === 'COLD') return 'Cold';
  return 'Warm';
}

export function RecentLeadsTable({
  leads,
  basePath,
  title = 'Recent Leads',
  subtitle = 'Homeowner pipeline'
}: {
  leads: RecentDashboardLead[];
  basePath: string;
  title?: string;
  subtitle?: string;
}) {
  const [filter, setFilter] = useState<FilterValue>('ALL');

  const filteredLeads = useMemo(
    () => leads.filter((lead) => filter === 'ALL' || lead.status === filter),
    [filter, leads]
  );

  return (
    <section className="installer-panel installer-leads-panel">
      <div className="installer-panel-header">
        <div>
          <h2>{title}</h2>
          <p className="small">{subtitle}</p>
        </div>
        <select
          aria-label="Filter recent leads"
          className="installer-small-select"
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterValue)}
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="installer-table-wrap">
        <table className="installer-leads-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Eligibility Confidence</th>
              <th>Sales Signal</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const leadHref = lead.isSample ? '#' : `${basePath}/${lead.id}`;
              const phoneHref = lead.phone ? `tel:${lead.phone}` : leadHref;

              return (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.applicant}</strong>
                    <span>{lead.email}</span>
                  </td>
                  <td>{confidenceLabel(lead.confidence)}</td>
                  <td>
                    <span className={`installer-badge installer-signal-${lead.salesSignal.toLowerCase()}`}>
                      {signalLabel(lead.salesSignal)}
                    </span>
                  </td>
                  <td>
                    <span className={`installer-badge installer-status-${lead.status.toLowerCase().replaceAll('_', '-')}`}>
                      {lead.statusLabel}
                    </span>
                  </td>
                  <td>
                    <div className="installer-table-actions">
                      <Link href={leadHref}>Open Lead</Link>
                      <a href={phoneHref}>Call Now</a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
