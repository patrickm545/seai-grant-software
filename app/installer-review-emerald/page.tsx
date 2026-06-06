import type { Prisma } from '@prisma/client';
import { DashboardShell } from '@/components/DashboardShell';
import { KpiCards, type KpiCard } from '@/components/KpiCards';
import { PipelineWorkflow, type PipelineStage } from '@/components/PipelineWorkflow';
import { RecentLeadsTable, type RecentDashboardLead } from '@/components/RecentLeadsTable';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import { prisma } from '@/lib/prisma';

const ADMIN_LEAD_BASE_PATH = '/installer-review-emerald/leads';
export const dynamic = 'force-dynamic';

type DashboardLead = Prisma.LeadGetPayload<{
  include: { installer: true; documents: true };
}>;

const pipelineStageLabels = [
  'Homeowner Visit',
  'Eligibility Check Verified',
  'Installer Assigned',
  'Admin Review',
  'Grant Submitted',
  'Follow-up'
] as const;

const sampleLeads: RecentDashboardLead[] = [
  {
    id: 'sample-patrick',
    applicant: 'Patrick McKenna',
    email: 'patrick@example.ie',
    phone: '+353831234567',
    confidence: 0.94,
    salesSignal: 'HOT',
    status: 'READY_TO_APPLY',
    statusLabel: 'Ready to Apply',
    isSample: true
  },
  {
    id: 'sample-liam-1',
    applicant: "Liam O'Sullivan",
    email: 'liam@example.ie',
    phone: '+353871234567',
    confidence: 0.81,
    salesSignal: 'HOT',
    status: 'NEEDS_INFO',
    statusLabel: 'Needs Info',
    isSample: true
  },
  {
    id: 'sample-liam-2',
    applicant: "Liam O'Sullivan",
    email: 'liam.solar@example.ie',
    phone: '+353861234567',
    confidence: 0.82,
    salesSignal: 'WARM',
    status: 'NEEDS_INFO',
    statusLabel: 'Needs Info',
    isSample: true
  },
  {
    id: 'sample-sarah',
    applicant: 'Sarah Byrne',
    email: 'sarah@example.ie',
    phone: '+353851234567',
    confidence: 0.74,
    salesSignal: 'HOT',
    status: 'READY_TO_APPLY',
    statusLabel: 'Ready to Apply',
    isSample: true
  },
  {
    id: 'sample-aoife',
    applicant: 'Aoife Walsh',
    email: 'aoife@example.ie',
    phone: '+353891234567',
    confidence: 0.7,
    salesSignal: 'COLD',
    status: 'UNDER_REVIEW',
    statusLabel: 'Under Review',
    isSample: true
  }
];

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

function getLeadTemperature(lead: DashboardLead): RecentDashboardLead['salesSignal'] {
  const value = getSalesSignal(lead.structuredExportJson)?.leadTemperature;
  return value === 'HOT' || value === 'WARM' || value === 'COLD' ? value : 'WARM';
}

function isNeedsAction(lead: DashboardLead) {
  return (
    lead.status === 'NEEDS_REVIEW' ||
    lead.status === 'HOMEOWNER_REVIEW_PENDING' ||
    lead.worksStarted ||
    lead.likelyEligible === false
  );
}

function isLiabilityLead(lead: DashboardLead) {
  return lead.worksStarted || lead.priorSolarGrantAtMprn || lead.likelyEligible === false;
}

function toRecentStatus(lead: DashboardLead): Pick<RecentDashboardLead, 'status' | 'statusLabel'> {
  if (lead.status === 'READY_TO_APPLY') {
    return { status: 'READY_TO_APPLY', statusLabel: 'Ready to Apply' };
  }

  if (lead.status === 'NEEDS_REVIEW' || lead.status === 'HOMEOWNER_REVIEW_PENDING' || lead.status === 'PAYMENT_DOCS_PENDING') {
    return { status: 'NEEDS_INFO', statusLabel: 'Needs Info' };
  }

  return { status: 'UNDER_REVIEW', statusLabel: 'Under Review' };
}

function toRecentLead(lead: DashboardLead): RecentDashboardLead {
  return {
    id: lead.id,
    applicant: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    confidence: lead.eligibilityConfidence,
    salesSignal: getLeadTemperature(lead),
    ...toRecentStatus(lead)
  };
}

function getPipelineCount(stage: (typeof pipelineStageLabels)[number], leads: DashboardLead[]) {
  if (stage === 'Homeowner Visit') return leads.length;
  if (stage === 'Eligibility Check Verified') return leads.filter((lead) => lead.likelyEligible !== null).length;
  if (stage === 'Installer Assigned') return leads.filter((lead) => !!lead.assignedInstaller).length;
  if (stage === 'Admin Review') return leads.filter((lead) => lead.status === 'NEEDS_REVIEW' || lead.status === 'HOMEOWNER_REVIEW_PENDING').length;
  if (stage === 'Grant Submitted') return leads.filter((lead) => lead.status === 'SUBMITTED').length;
  return leads.filter((lead) => !!lead.followUpDate || lead.status === 'INSTALLATION_PENDING' || lead.status === 'PAYMENT_DOCS_PENDING').length;
}

function getActivePipelineIndex(leads: DashboardLead[]) {
  if (leads.some((lead) => !!lead.followUpDate || lead.status === 'INSTALLATION_PENDING' || lead.status === 'PAYMENT_DOCS_PENDING')) return 5;
  if (leads.some((lead) => lead.status === 'SUBMITTED')) return 4;
  if (leads.some((lead) => lead.status === 'NEEDS_REVIEW' || lead.status === 'HOMEOWNER_REVIEW_PENDING')) return 3;
  if (leads.some((lead) => !!lead.assignedInstaller)) return 2;
  if (leads.some((lead) => lead.likelyEligible !== null)) return 1;
  return leads.length ? 0 : 1;
}

function buildPipelineStages(leads: DashboardLead[]): PipelineStage[] {
  const activeIndex = getActivePipelineIndex(leads);
  const icons = ['H', 'V', 'I', 'A', 'G', 'F'];

  return pipelineStageLabels.map((label, index) => ({
    label,
    count: getPipelineCount(label, leads),
    icon: icons[index],
    state: index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'inactive'
  }));
}

export default async function HiddenAdminPage() {
  const leads: DashboardLead[] = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { installer: true, documents: true }
  });

  const activePipelines = leads.length;
  const highPriorityLeads = leads.filter((lead) => getLeadTemperature(lead) === 'HOT').length;
  const seaiApprovals = leads.filter((lead) => lead.status === 'SUBMITTED' || lead.status === 'COMPLETED').length;
  const pendingDocs = leads.filter((lead) => lead.status === 'PAYMENT_DOCS_PENDING' || lead.documents.length === 0).length;
  const openBlockers = leads.filter(isNeedsAction).length;
  const liabilityLeads = leads.filter(isLiabilityLead).length;
  const trackedCounties = new Set(leads.map((lead) => lead.county).filter(Boolean)).size;

  const kpiCards: KpiCard[] = [
    { label: 'Active Pipelines', value: activePipelines, icon: 'P', tone: 'green' },
    { label: 'High Priority Leads', value: highPriorityLeads, icon: '!', tone: 'amber' },
    { label: 'SEAI Approvals', value: seaiApprovals, icon: 'OK', tone: 'green' },
    { label: 'Pending Docs', value: pendingDocs, icon: 'D', tone: 'blue' }
  ];

  const recentLeads = leads.length ? leads.map(toRecentLead) : sampleLeads;
  const userName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Patrick McKenna';

  return (
    <DashboardShell
      userName={userName}
      sidebar={
        <SidebarMetrics
          trackedCounties={trackedCounties || 6}
          openBlockers={openBlockers}
          liabilityLeads={liabilityLeads}
        />
      }
    >
      <div className="installer-dashboard-heading">
        <div>
          <h1>SOLARgrant PRO: Installer Dashboard</h1>
        </div>
        <a href="/embed" className="installer-add-button">Open intake</a>
      </div>

      <KpiCards cards={kpiCards} />
      <PipelineWorkflow stages={buildPipelineStages(leads)} />
      <RecentLeadsTable leads={recentLeads} basePath={ADMIN_LEAD_BASE_PATH} />
    </DashboardShell>
  );
}
