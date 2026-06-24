import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { updateLeadPipelineStage } from '@/app/installer-review-emerald/actions';
import { DashboardShell } from '@/components/DashboardShell';
import { KpiCards, type KpiCard } from '@/components/KpiCards';
import { PipelineWorkflow, type PipelineStage } from '@/components/PipelineWorkflow';
import { RecentLeadsTable, type RecentDashboardLead } from '@/components/RecentLeadsTable';
import { SidebarMetrics } from '@/components/SidebarMetrics';
import {
  getActivityTone,
  getActivityTypeLabel,
  getLeadScoreLabel,
  getPipelineStageIcon,
  getPipelineStageLabel,
  getPipelineStageShortLabel,
  isClosedPipelineStage,
  leadPipelineStages,
  type LeadPipelineStageValue,
  type LeadScoreValue
} from '@/lib/crm';
import { prisma } from '@/lib/prisma';

const ADMIN_LEAD_BASE_PATH = '/installer-review-emerald/leads';
export const dynamic = 'force-dynamic';

type DashboardLead = Prisma.LeadGetPayload<{
  include: { installer: true; documents: true; activities: true };
}>;

type RecentActivity = Prisma.LeadActivityGetPayload<{
  include: {
    lead: {
      select: {
        id: true;
        fullName: true;
        county: true;
        eircode: true;
      };
    };
  };
}>;

const sampleLeads: RecentDashboardLead[] = [
  {
    id: 'sample-patrick',
    applicant: 'Patrick McKenna',
    email: 'patrick@example.ie',
    phone: '+353831234567',
    location: 'Dublin / D01TEST',
    confidence: 0.94,
    leadScore: 'HOT',
    pipelineStage: 'QUALIFIED',
    lastActivityAt: null,
    isSample: true
  },
  {
    id: 'sample-sarah',
    applicant: 'Sarah Byrne',
    email: 'sarah@example.ie',
    phone: '+353851234567',
    location: 'Cork / T12DEMO',
    confidence: 0.74,
    leadScore: 'WARM',
    pipelineStage: 'CONTACTED',
    lastActivityAt: null,
    isSample: true
  },
  {
    id: 'sample-aoife',
    applicant: 'Aoife Walsh',
    email: 'aoife@example.ie',
    phone: '+353891234567',
    location: 'Galway / H91DEMO',
    confidence: 0.7,
    leadScore: 'COLD',
    pipelineStage: 'NEW_LEAD',
    lastActivityAt: null,
    isSample: true
  }
];

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

function getLastActivityAt(lead: DashboardLead) {
  return lead.activities[0]?.createdAt ?? lead.updatedAt ?? lead.createdAt;
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getLeadLocation(lead: Pick<DashboardLead, 'county' | 'eircode'>) {
  return [lead.county, lead.eircode || 'No Eircode'].filter(Boolean).join(' / ');
}

function toRecentLead(lead: DashboardLead): RecentDashboardLead {
  return {
    id: lead.id,
    applicant: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    location: getLeadLocation(lead),
    confidence: lead.eligibilityConfidence,
    leadScore: lead.leadScore as LeadScoreValue,
    pipelineStage: lead.pipelineStage as LeadPipelineStageValue,
    lastActivityAt: getLastActivityAt(lead).toISOString()
  };
}

function getPipelineCount(stage: LeadPipelineStageValue, leads: DashboardLead[]) {
  return leads.filter((lead) => lead.pipelineStage === stage).length;
}

function buildPipelineStages(leads: DashboardLead[]): PipelineStage[] {
  return leadPipelineStages.map((stage) => {
    const count = getPipelineCount(stage, leads);
    return {
      label: getPipelineStageLabel(stage),
      count,
      icon: getPipelineStageIcon(stage),
      state: count > 0 ? 'active' : 'inactive'
    };
  });
}

function isFollowUpDue(lead: DashboardLead) {
  if (isClosedPipelineStage(lead.pipelineStage)) return false;

  const now = new Date();
  const nextFollowUpAt = lead.nextFollowUpAt ?? lead.followUpDate;
  if (nextFollowUpAt && nextFollowUpAt <= now) return true;

  const lastTouch = lead.lastContactedAt ?? lead.activities[0]?.createdAt ?? lead.updatedAt ?? lead.createdAt;
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - lastTouch.getTime() > staleAfterMs;
}

function sortByRecentActivity(a: DashboardLead, b: DashboardLead) {
  return getLastActivityAt(b).getTime() - getLastActivityAt(a).getTime();
}

function PipelineSummaryCards({ leads }: { leads: DashboardLead[] }) {
  return (
    <section className="crm-pipeline-summary-grid" aria-label="CRM pipeline summary">
      {leadPipelineStages.map((stage) => (
        <article key={stage} className={`crm-pipeline-summary-card crm-pipeline-summary-${stage.toLowerCase().replaceAll('_', '-')}`}>
          <span>{getPipelineStageShortLabel(stage)}</span>
          <strong>{getPipelineCount(stage, leads)}</strong>
        </article>
      ))}
    </section>
  );
}

function LeadMiniList({
  title,
  subtitle,
  leads,
  emptyText
}: {
  title: string;
  subtitle: string;
  leads: DashboardLead[];
  emptyText: string;
}) {
  return (
    <section className="installer-panel crm-list-panel">
      <div className="installer-panel-header">
        <div>
          <h2>{title}</h2>
          <p className="small">{subtitle}</p>
        </div>
      </div>
      <div className="crm-list-body">
        {leads.length ? leads.map((lead) => (
          <Link key={lead.id} href={`${ADMIN_LEAD_BASE_PATH}/${lead.id}`} className="crm-lead-row">
            <div>
              <strong>{lead.fullName}</strong>
              <span>{getLeadLocation(lead)}</span>
            </div>
            <div className="crm-lead-row-meta">
              <span className={`installer-badge installer-signal-${lead.leadScore.toLowerCase()}`}>
                {getLeadScoreLabel(lead.leadScore)}
              </span>
              <span className={`installer-badge installer-stage-${lead.pipelineStage.toLowerCase().replaceAll('_', '-')}`}>
                {getPipelineStageLabel(lead.pipelineStage)}
              </span>
              <small>{formatDateTime(getLastActivityAt(lead))}</small>
            </div>
          </Link>
        )) : (
          <div className="crm-empty-panel">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

function RecentActivityPanel({ activities }: { activities: RecentActivity[] }) {
  return (
    <section className="installer-panel crm-activity-panel">
      <div className="installer-panel-header">
        <div>
          <h2>Recent Activity</h2>
          <p className="small">Latest CRM timeline events across all leads</p>
        </div>
      </div>
      <div className="crm-activity-list">
        {activities.length ? activities.map((activity) => (
          <Link key={activity.id} href={`${ADMIN_LEAD_BASE_PATH}/${activity.leadId}`} className="crm-activity-row">
            <span className={`crm-activity-dot crm-activity-dot-${getActivityTone(activity.type)}`} aria-hidden="true" />
            <div>
              <strong>{activity.title}</strong>
              <span>{activity.lead.fullName} / {getLeadLocation(activity.lead)}</span>
            </div>
            <small>{formatDateTime(activity.createdAt)}</small>
            <em>{getActivityTypeLabel(activity.type)}</em>
          </Link>
        )) : (
          <div className="crm-empty-panel">CRM activity will appear after stage changes, notes, follow-ups, and new intake submissions.</div>
        )}
      </div>
    </section>
  );
}

export default async function HiddenAdminPage() {
  const [leads, recentActivities] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        installer: true,
        documents: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    }),
    prisma.leadActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            county: true,
            eircode: true
          }
        }
      }
    })
  ]);

  const activePipelines = leads.filter((lead) => !isClosedPipelineStage(lead.pipelineStage)).length;
  const highPriorityLeads = leads.filter((lead) => lead.leadScore === 'HOT' && !isClosedPipelineStage(lead.pipelineStage)).length;
  const seaiApprovals = leads.filter((lead) => lead.status === 'SUBMITTED' || lead.status === 'COMPLETED').length;
  const pendingDocs = leads.filter((lead) => lead.status === 'PAYMENT_DOCS_PENDING' || lead.documents.length === 0).length;
  const openBlockers = leads.filter(isNeedsAction).length;
  const liabilityLeads = leads.filter(isLiabilityLead).length;
  const trackedCounties = new Set(leads.map((lead) => lead.county).filter(Boolean)).size;
  const hotLeads = leads
    .filter((lead) => lead.leadScore === 'HOT' && !isClosedPipelineStage(lead.pipelineStage))
    .sort(sortByRecentActivity)
    .slice(0, 5);
  const followUpLeads = leads
    .filter(isFollowUpDue)
    .sort((a, b) => {
      const aDate = a.nextFollowUpAt ?? a.followUpDate ?? getLastActivityAt(a);
      const bDate = b.nextFollowUpAt ?? b.followUpDate ?? getLastActivityAt(b);
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, 5);

  const kpiCards: KpiCard[] = [
    { label: 'Active Pipeline', value: activePipelines, icon: 'P', tone: 'green' },
    { label: 'Hot Leads', value: highPriorityLeads, icon: 'H', tone: 'amber' },
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
          <div className="eyebrow">Clada OS</div>
          <h1>Solar Installer CRM Dashboard</h1>
          <p className="small">Pipeline, follow-up, lead quality, grant readiness, and recent sales activity.</p>
        </div>
        <a href="/embed" className="installer-add-button">Open intake</a>
      </div>

      <KpiCards cards={kpiCards} />
      <PipelineSummaryCards leads={leads} />
      <PipelineWorkflow stages={buildPipelineStages(leads)} />

      <div className="crm-dashboard-grid">
        <LeadMiniList
          title="Hot Leads"
          subtitle="Highest-priority active opportunities"
          leads={hotLeads}
          emptyText="No hot active leads right now."
        />
        <LeadMiniList
          title="Follow-Up Needed"
          subtitle="Due follow-ups or leads without recent contact"
          leads={followUpLeads}
          emptyText="No overdue follow-ups right now."
        />
      </div>

      <RecentActivityPanel activities={recentActivities} />
      <RecentLeadsTable leads={recentLeads} basePath={ADMIN_LEAD_BASE_PATH} updateStageAction={updateLeadPipelineStage} />
    </DashboardShell>
  );
}
