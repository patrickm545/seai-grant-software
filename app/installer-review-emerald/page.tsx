import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { updateLeadPipelineStage } from '@/app/installer-review-emerald/actions';
import { DashboardShell } from '@/components/DashboardShell';
import { IntakeLinkActions } from '@/components/IntakeLinkActions';
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
  isClosedPipelineStage,
  leadPipelineStages,
  type LeadPipelineStageValue,
  type LeadScoreValue
} from '@/lib/crm';
import { getDashboardMetrics } from '@/lib/dashboard-metrics';
import { requirePilotContext } from '@/lib/pilot-auth';
import { leadActivityOrganisationWhere, leadOrganisationWhere } from '@/lib/lead-access';
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
          <div className="crm-empty-panel"><strong>No recent activity</strong><br />Activity will appear after intake submissions and CRM updates.</div>
        )}
      </div>
    </section>
  );
}

export default async function HiddenAdminPage() {
  const organisationContext = await requirePilotContext();
  const [leads, recentActivities, installer] = await Promise.all([
    prisma.lead.findMany({
      where: leadOrganisationWhere(organisationContext),
      orderBy: { createdAt: 'desc' },
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
      where: leadActivityOrganisationWhere(organisationContext),
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
    }),
    prisma.installer.findFirst({
      where: { organisationId: organisationContext.organisationId },
      select: { id: true }
    })
  ]);

  const intakePath = installer ? `/embed?installerId=${encodeURIComponent(installer.id)}` : null;

  const metrics = getDashboardMetrics(leads);
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
    { label: 'Active Leads', value: metrics.activeLeads, icon: 'P', tone: 'green' },
    { label: 'Hot Leads', value: metrics.hotLeads, icon: 'H', tone: 'amber' },
    { label: 'Applications Submitted', value: metrics.applicationsSubmitted, icon: 'S', tone: 'green' },
    { label: 'Leads Without Documents', value: metrics.leadsWithoutDocuments, icon: 'D', tone: 'blue' }
  ];

  const recentLeads = leads.map(toRecentLead);
  return (
    <DashboardShell
      userName={organisationContext.userName}
      organisationName={organisationContext.organisationName}
      role={organisationContext.pilotRole}
      sidebar={
        <SidebarMetrics
          openBlockers={metrics.openBlockers}
          eligibilityConcerns={metrics.eligibilityConcerns}
        />
      }
    >
      <div className="installer-dashboard-heading">
        <div>
          <div className="eyebrow">Clada OS</div>
          <h1>Installer operations dashboard</h1>
          <p className="small">Pipeline, follow-up, lead quality, grant readiness, and recent sales activity.</p>
        </div>
        {intakePath ? <a href={intakePath} className="installer-add-button">Open intake</a> : null}
      </div>

      {leads.length === 0 ? (
        <section className="dashboard-primary-empty" data-empty-state="organisation">
          <div>
            <div className="eyebrow">Getting started</div>
            <h2>No leads yet</h2>
            <p>New homeowner enquiries will appear here when they complete your SolarGRANT Pro intake form.</p>
          </div>
          {intakePath ? <IntakeLinkActions intakePath={intakePath} /> : null}
        </section>
      ) : null}

      <KpiCards cards={kpiCards} />
      <PipelineWorkflow stages={buildPipelineStages(leads)} />

      <div className="crm-dashboard-grid">
        <LeadMiniList
          title="Hot leads"
          subtitle="Highest-priority active opportunities"
          leads={hotLeads}
          emptyText={leads.length === 0 ? 'No hot leads. Hot leads will appear here after homeowner enquiries arrive.' : 'No hot leads match the current priority criteria.'}
        />
        <LeadMiniList
          title="Follow-up needed"
          subtitle="Due follow-ups or leads without recent contact"
          leads={followUpLeads}
          emptyText={leads.length === 0 ? 'No follow-ups due. Follow-ups will appear here after homeowner enquiries arrive.' : 'No follow-ups are due.'}
        />
      </div>

      <RecentActivityPanel activities={recentActivities} />
      <RecentLeadsTable leads={recentLeads} basePath={ADMIN_LEAD_BASE_PATH} intakePath={intakePath} updateStageAction={updateLeadPipelineStage} />
    </DashboardShell>
  );
}
