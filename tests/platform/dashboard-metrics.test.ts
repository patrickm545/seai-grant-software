import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardMetrics } from '../../lib/dashboard-metrics';

function lead(overrides: Partial<Parameters<typeof getDashboardMetrics>[0][number]> = {}) {
  return {
    status: 'NEW',
    pipelineStage: 'NEW_LEAD',
    leadScore: 'WARM',
    worksStarted: false,
    priorSolarGrantAtMprn: false,
    likelyEligible: null,
    documents: [],
    ...overrides
  };
}

test('an empty organisation receives truthful zero dashboard and pipeline counts', () => {
  const metrics = getDashboardMetrics([]);

  assert.deepEqual(metrics, {
    activeLeads: 0,
    hotLeads: 0,
    applicationsSubmitted: 0,
    leadsWithoutDocuments: 0,
    openBlockers: 0,
    eligibilityConcerns: 0,
    pipelineCounts: {
      NEW_LEAD: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      SURVEY_BOOKED: 0,
      SURVEY_COMPLETED: 0,
      QUOTE_SENT: 0,
      WON: 0,
      LOST: 0
    }
  });
});

test('dashboard KPIs use their documented persisted definitions', () => {
  const metrics = getDashboardMetrics([
    lead({ pipelineStage: 'QUALIFIED', leadScore: 'HOT', likelyEligible: false }),
    lead({ status: 'SUBMITTED', pipelineStage: 'QUOTE_SENT', documents: [{ id: 'doc-1' }] }),
    lead({ status: 'INSTALLATION_PENDING', pipelineStage: 'WON', worksStarted: true }),
    lead({ status: 'COMPLETED', pipelineStage: 'LOST', priorSolarGrantAtMprn: true })
  ]);

  assert.equal(metrics.activeLeads, 2);
  assert.equal(metrics.hotLeads, 1);
  assert.equal(metrics.applicationsSubmitted, 3);
  assert.equal(metrics.leadsWithoutDocuments, 3);
  assert.equal(metrics.openBlockers, 2);
  assert.equal(metrics.eligibilityConcerns, 3);
  assert.equal(metrics.pipelineCounts.QUALIFIED, 1);
  assert.equal(metrics.pipelineCounts.QUOTE_SENT, 1);
  assert.equal(metrics.pipelineCounts.WON, 1);
  assert.equal(metrics.pipelineCounts.LOST, 1);
});

test('a stored zero is never replaced by a positive fallback', () => {
  const metrics = getDashboardMetrics([lead({ pipelineStage: 'LOST', documents: [{ id: 'doc-1' }] })]);

  assert.equal(metrics.activeLeads, 0);
  assert.equal(metrics.hotLeads, 0);
  assert.equal(metrics.applicationsSubmitted, 0);
  assert.equal(metrics.leadsWithoutDocuments, 0);
});
