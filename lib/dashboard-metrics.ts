import { leadPipelineStages, type LeadPipelineStageValue } from './crm';
import { classifySolarGrantJurisdiction } from './solargrant-jurisdiction';

export type DashboardMetricLead = {
  status: string;
  pipelineStage: string;
  leadScore: string;
  worksStarted: boolean | null;
  priorSolarGrantAtMprn: boolean | null;
  likelyEligible: boolean | null;
  county?: string | null;
  eircode?: string | null;
  documents: readonly unknown[];
};

const submittedApplicationStatuses = new Set([
  'SUBMITTED',
  'INSTALLATION_PENDING',
  'PAYMENT_DOCS_PENDING',
  'COMPLETED'
]);

export function isOpenBlocker(lead: DashboardMetricLead) {
  const jurisdiction = classifySolarGrantJurisdiction(lead);
  return (
    !jurisdiction.isSupported ||
    lead.status === 'NEEDS_REVIEW' ||
    lead.status === 'HOMEOWNER_REVIEW_PENDING' ||
    lead.worksStarted ||
    lead.likelyEligible === false
  );
}

export function isEligibilityConcern(lead: DashboardMetricLead) {
  const jurisdiction = classifySolarGrantJurisdiction(lead);
  const knownJurisdictionConcern = !jurisdiction.isSupported && jurisdiction.reason !== 'MISSING_COUNTY';
  return knownJurisdictionConcern
    || lead.worksStarted === true
    || lead.priorSolarGrantAtMprn === true
    || lead.likelyEligible === false;
}

export function getPipelineCounts(leads: readonly DashboardMetricLead[]) {
  return leadPipelineStages.reduce<Record<LeadPipelineStageValue, number>>((counts, stage) => {
    counts[stage] = leads.filter((lead) => lead.pipelineStage === stage).length;
    return counts;
  }, {} as Record<LeadPipelineStageValue, number>);
}

/**
 * Dashboard KPIs intentionally describe only persisted lead facts:
 * - activeLeads: leads outside Won/Lost stages;
 * - hotLeads: active leads with the persisted HOT score;
 * - applicationsSubmitted: leads at or beyond the stored SUBMITTED status;
 * - leadsWithoutDocuments: leads with no uploaded document records.
 * No positive defaults or inferred SEAI approval state are used.
 */
export function getDashboardMetrics(leads: readonly DashboardMetricLead[]) {
  const activeLeads = leads.filter((lead) => lead.pipelineStage !== 'WON' && lead.pipelineStage !== 'LOST');

  return {
    activeLeads: activeLeads.length,
    hotLeads: activeLeads.filter((lead) => lead.leadScore === 'HOT' && classifySolarGrantJurisdiction(lead).isSupported).length,
    applicationsSubmitted: leads.filter((lead) => submittedApplicationStatuses.has(lead.status)).length,
    leadsWithoutDocuments: leads.filter((lead) => lead.documents.length === 0).length,
    openBlockers: leads.filter(isOpenBlocker).length,
    eligibilityConcerns: leads.filter(isEligibilityConcern).length,
    pipelineCounts: getPipelineCounts(leads)
  };
}
