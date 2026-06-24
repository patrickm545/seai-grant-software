'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  getLeadScoreLabel,
  getPipelineStageLabel,
  leadPipelineStages,
  type LeadPipelineStageValue,
  type LeadScoreValue
} from '@/lib/crm';

export type RecentDashboardLead = {
  id: string;
  applicant: string;
  email: string;
  phone: string | null;
  location: string;
  confidence: number | null;
  leadScore: LeadScoreValue;
  pipelineStage: LeadPipelineStageValue;
  lastActivityAt: string | null;
  isSample?: boolean;
};

const filterOptions = [
  { label: 'All leads', value: 'ALL' },
  { label: 'Hot', value: 'HOT' },
  { label: 'New Lead', value: 'NEW_LEAD' },
  { label: 'Contacted', value: 'CONTACTED' },
  { label: 'Qualified', value: 'QUALIFIED' },
  { label: 'Survey Booked', value: 'SURVEY_BOOKED' },
  { label: 'Quote Sent', value: 'QUOTE_SENT' }
] as const;

type FilterValue = (typeof filterOptions)[number]['value'];

function confidenceLabel(value: number | null) {
  return value === null ? 'Pending' : `${Math.round(value * 100)}%`;
}

function formatLastActivity(value: string | null) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';
  return new Intl.DateTimeFormat('en-IE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function RecentLeadsTable({
  leads,
  basePath,
  updateStageAction,
  title = 'Recent leads',
  subtitle = 'Homeowner pipeline'
}: {
  leads: RecentDashboardLead[];
  basePath: string;
  updateStageAction?: (formData: FormData) => void | Promise<void>;
  title?: string;
  subtitle?: string;
}) {
  const [filter, setFilter] = useState<FilterValue>('ALL');

  const filteredLeads = useMemo(
    () => leads.filter((lead) => filter === 'ALL' || lead.leadScore === filter || lead.pipelineStage === filter),
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
              <th>Stage</th>
              <th>Lead Score</th>
              <th>Last Activity</th>
              <th>Eligibility</th>
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
                    <span>{lead.location}</span>
                  </td>
                  <td>
                    <span className={`installer-badge installer-stage-${lead.pipelineStage.toLowerCase().replaceAll('_', '-')}`}>
                      {getPipelineStageLabel(lead.pipelineStage)}
                    </span>
                    {updateStageAction && !lead.isSample ? (
                      <form action={updateStageAction} className="installer-inline-stage-form">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <select name="pipelineStage" defaultValue={lead.pipelineStage} aria-label={`Update stage for ${lead.applicant}`}>
                          {leadPipelineStages.map((stage) => (
                            <option key={stage} value={stage}>{getPipelineStageLabel(stage)}</option>
                          ))}
                        </select>
                        <button type="submit">Update</button>
                      </form>
                    ) : null}
                  </td>
                  <td>
                    <span className={`installer-badge installer-signal-${lead.leadScore.toLowerCase()}`}>
                      {getLeadScoreLabel(lead.leadScore)}
                    </span>
                  </td>
                  <td>
                    <span className="installer-table-muted">{formatLastActivity(lead.lastActivityAt)}</span>
                  </td>
                  <td>
                    {confidenceLabel(lead.confidence)}
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
