import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const projectRoot = resolve(process.cwd());
const dashboard = readFileSync(resolve(projectRoot, 'app/installer-review-emerald/page.tsx'), 'utf8');
const leadTable = readFileSync(resolve(projectRoot, 'components/RecentLeadsTable.tsx'), 'utf8');
const sidebar = readFileSync(resolve(projectRoot, 'components/SidebarMetrics.tsx'), 'utf8');
const embedPage = readFileSync(resolve(projectRoot, 'app/embed/page.tsx'), 'utf8');
const intakeActions = readFileSync(resolve(projectRoot, 'components/IntakeLinkActions.tsx'), 'utf8');

test('dashboard runtime contains no synthetic leads or positive metric fallbacks', () => {
  assert.doesNotMatch(dashboard, /sampleLeads|isSample|trackedCounties\s*\|\||SEAI Approvals|Pending Docs/);
  assert.doesNotMatch(sidebar, /Tracked Counties|Liability Leads|\|\|\s*['"]-['"]/);
});

test('organisation and filtered empty states have distinct truthful copy', () => {
  assert.match(dashboard, /No leads yet/);
  assert.match(dashboard, /New homeowner enquiries will appear here/);
  assert.match(dashboard, /No hot leads/);
  assert.match(dashboard, /No follow-ups due/);
  assert.match(dashboard, /No recent activity/);
  assert.match(leadTable, /data-empty-state="organisation"/);
  assert.match(leadTable, /No leads match this filter/);
  assert.match(leadTable, /Reset filter/);
  assert.doesNotMatch(dashboard, /Add lead/i);
});

test('dashboard retains one pipeline count visualisation', () => {
  assert.match(dashboard, /<PipelineWorkflow/);
  assert.doesNotMatch(dashboard, /PipelineSummaryCards|crm-pipeline-summary-grid/);
});

test('intake actions use the active organisation installer and never fall back to another tenant', () => {
  assert.match(dashboard, /organisationId: organisationContext\.organisationId/);
  assert.match(dashboard, /installer \? `\/embed\?installerId=/);
  assert.match(dashboard, /: null/);
  assert.match(embedPage, /searchParams/);
  assert.match(embedPage, /<LeadForm installerId={resolvedInstallerId}/);
});

test('dashboard has one intake-opening CTA and retains copy only when a tenant URL exists', () => {
  assert.equal(dashboard.match(/href={intakePath}/g)?.length, 1);
  assert.doesNotMatch(intakeActions, /Open intake form|<Link/);
  assert.match(intakeActions, /Copy tenant intake link/);
  assert.match(intakeActions, /Copy intake link/);
  assert.match(dashboard, /intakePath \? <IntakeLinkActions intakePath={intakePath} \/> : null/);
  assert.match(dashboard, /intakePath \? <a href={intakePath}/);
});
