'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type InstallerDashboardLead = {
  id: string;
  fullName: string;
  email: string;
  county: string;
  eircode: string | null;
  status: string;
  statusLabel: string;
  statusTone: string;
  leadTemperature: 'HOT' | 'WARM' | 'COLD';
  leadTemperatureTone: string;
  installTimeline: string;
  likelyEligible: boolean | null;
  eligibilityConfidence: number | null;
  documentsCount: number;
  needsAction: boolean;
  createdAt: string;
};

const filters = [
  'All',
  'Hot',
  'Warm',
  'Cold',
  'Needs Action',
  'Ready to Apply',
  'Submitted'
] as const;

type LeadFilter = (typeof filters)[number];

function matchesFilter(lead: InstallerDashboardLead, filter: LeadFilter) {
  if (filter === 'Hot') return lead.leadTemperature === 'HOT';
  if (filter === 'Warm') return lead.leadTemperature === 'WARM';
  if (filter === 'Cold') return lead.leadTemperature === 'COLD';
  if (filter === 'Needs Action') return lead.needsAction;
  if (filter === 'Ready to Apply') return lead.status === 'READY_TO_APPLY';
  if (filter === 'Submitted') return lead.status === 'SUBMITTED';
  return true;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unknown';
  return new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: 'short' }).format(date);
}

export function InstallerLeadTable({ leads, basePath }: { leads: InstallerDashboardLead[]; basePath: string }) {
  const [activeFilter, setActiveFilter] = useState<LeadFilter>('All');

  const filteredLeads = useMemo(
    () => leads.filter((lead) => matchesFilter(lead, activeFilter)),
    [activeFilter, leads]
  );

  return (
    <section className="card lead-table-card">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Pipeline table</div>
          <h2>Recent leads</h2>
        </div>
        <div className="small">Showing {filteredLeads.length} of {leads.length} homeowner records</div>
      </div>

      <div className="quick-filter-bar" aria-label="Lead filters">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-chip ${activeFilter === filter ? 'filter-chip-active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="table-wrap lead-table-scroll" aria-live="polite">
        {filteredLeads.length ? (
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
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className={lead.needsAction ? 'lead-row-needs-action' : undefined}>
                  <td>
                    <div className="lead-primary">
                      <strong>{lead.fullName}</strong>
                      <div className="small">{lead.email}</div>
                      <div className="small">{lead.county} / {lead.eircode || 'No Eircode yet'} / {formatDate(lead.createdAt)}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-pill-${lead.statusTone}`}>{lead.statusLabel}</span>
                    {lead.needsAction ? <div className="small action-needed-copy">Needs action</div> : null}
                  </td>
                  <td>
                    <div className="lead-eligibility">
                      <span className={`status-pill status-pill-${lead.leadTemperatureTone}`}>{lead.leadTemperature}</span>
                      <div className="small">{lead.installTimeline}</div>
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
                    <div className="small">{lead.documentsCount} upload{lead.documentsCount === 1 ? '' : 's'}</div>
                  </td>
                  <td>
                    <Link href={`${basePath}/${lead.id}`} className="table-link">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No leads match this filter</h3>
            <p className="small">Try All, or wait for the next homeowner intake submission.</p>
          </div>
        )}
      </div>
    </section>
  );
}
