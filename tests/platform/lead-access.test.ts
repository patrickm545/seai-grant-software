import assert from 'node:assert/strict';
import test from 'node:test';
import {
  leadActivityOrganisationWhere,
  leadDocumentOrganisationWhere,
  leadOrganisationWhere
} from '../../lib/lead-access';

const scope = { organisationId: 'org-a' };

test('scopes lead reads to the active organisation', () => {
  assert.deepEqual(leadOrganisationWhere(scope, { id: 'lead-a' }), {
    AND: [
      { organisationId: 'org-a' },
      { id: 'lead-a' }
    ]
  });
});

test('client supplied organisation IDs cannot remove server scope', () => {
  assert.deepEqual(leadOrganisationWhere(scope, { id: 'lead-b', organisationId: 'org-b' }), {
    AND: [
      { organisationId: 'org-a' },
      { id: 'lead-b', organisationId: 'org-b' }
    ]
  });
});

test('scopes lead activity and documents through their parent lead', () => {
  assert.deepEqual(leadActivityOrganisationWhere(scope, { leadId: 'lead-a' }), {
    AND: [
      { lead: { organisationId: 'org-a' } },
      { leadId: 'lead-a' }
    ]
  });

  assert.deepEqual(leadDocumentOrganisationWhere(scope, { id: 'doc-a' }), {
    AND: [
      { lead: { organisationId: 'org-a' } },
      { id: 'doc-a' }
    ]
  });
});
