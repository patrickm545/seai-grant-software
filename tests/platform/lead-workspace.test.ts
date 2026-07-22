import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import type { OrganisationContext } from '../../lib/identity';
import { describeLeadNextAction, getLeadWorkspaceViewModel } from '../../lib/lead-workspace';
import { AuthorizationError } from '../../lib/permissions';

const context: OrganisationContext = {
  organisationId: 'org-a',
  organisationName: 'Installer A',
  organisationType: 'INSTALLER',
  membershipId: 'membership-a',
  isOwner: false,
  role: 'ORGANISATION_MEMBER',
  actor: { actorType: 'human_user', userId: 'user-a', displayName: 'A User', email: 'a@example.ie' }
};

function leadFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-a',
    fullName: 'Aoife Murphy',
    email: 'aoife@example.ie',
    phone: null,
    county: 'Galway',
    eircode: null,
    pipelineStage: 'CONTACTED',
    likelyEligible: null,
    nextFollowUpAt: null,
    followUpDate: null,
    ...overrides
  };
}

test('workspace read is permission checked, organisation scoped, bounded, and returns truthful unknowns', async () => {
  let query: unknown;
  const db = {
    lead: {
      findFirst: async (value: unknown) => {
        query = value;
        return leadFixture();
      }
    }
  };

  const view = await getLeadWorkspaceViewModel({ db: db as never, context, leadId: 'lead-a' });
  assert.deepEqual((query as { where: unknown }).where, {
    AND: [{ organisationId: 'org-a' }, { id: 'lead-a' }]
  });
  assert.deepEqual(Object.keys((query as { select: Record<string, boolean> }).select).sort(), [
    'county', 'eircode', 'email', 'followUpDate', 'fullName',
    'id', 'likelyEligible', 'nextFollowUpAt', 'phone', 'pipelineStage'
  ]);
  assert.equal(view?.readiness.label, 'Eligibility not yet recorded');
  assert.equal(view?.ownerLabel, 'No reliable owner recorded');
  assert.equal(view?.nextAction.label, 'No follow-up scheduled');
});

test('cross-tenant or invalid lead identifiers return the same unavailable result', async () => {
  const db = { lead: { findFirst: async () => null } };
  assert.equal(await getLeadWorkspaceViewModel({ db: db as never, context, leadId: 'lead-from-org-b' }), null);
  assert.equal(await getLeadWorkspaceViewModel({ db: db as never, context, leadId: '../invalid' }), null);
});

test('missing or unauthorised membership is rejected before querying', async () => {
  let queried = false;
  const db = { lead: { findFirst: async () => { queried = true; return null; } } };
  const deniedContext = { ...context, role: 'SYSTEM_ACTOR' as const };

  await assert.rejects(
    () => getLeadWorkspaceViewModel({ db: db as never, context: deniedContext, leadId: 'lead-a' }),
    (error: unknown) => error instanceof AuthorizationError && error.code === 'PERMISSION_DENIED'
  );
  assert.equal(queried, false);
});

test('follow-up descriptions distinguish missing, upcoming, and overdue actions', () => {
  const now = new Date('2026-07-22T12:00:00.000Z');
  assert.equal(describeLeadNextAction(null, null, now).label, 'No follow-up scheduled');
  assert.equal(describeLeadNextAction(new Date('2026-07-23T12:00:00.000Z'), null, now).label, 'Next follow-up');
  assert.equal(describeLeadNextAction(new Date('2026-07-21T12:00:00.000Z'), null, now).label, 'Follow-up overdue');
});

test('canonical section routes, active navigation, loading state, and safe legacy redirects are present', () => {
  const root = resolve(process.cwd());
  const shell = readFileSync(resolve(root, 'components/LeadWorkspaceShell.tsx'), 'utf8');
  const loading = readFileSync(resolve(root, 'app/installer-review-emerald/leads/[id]/loading.tsx'), 'utf8');
  const parentError = readFileSync(resolve(root, 'app/installer-review-emerald/leads/error.tsx'), 'utf8');
  const adminRedirect = readFileSync(resolve(root, 'app/admin/leads/[id]/page.tsx'), 'utf8');
  const dashboardRedirect = readFileSync(resolve(root, 'app/admin/dashboard/leads/[id]/page.tsx'), 'utf8');

  for (const segment of ['documents', 'activity', 'tasks', 'notes']) {
    assert.match(shell, new RegExp(`segment: '${segment}'`));
    assert.doesNotThrow(() => readFileSync(resolve(root, `app/installer-review-emerald/leads/[id]/${segment}/page.tsx`), 'utf8'));
  }
  assert.match(shell, /aria-current={active \? 'page'/);
  assert.match(shell, /usePathname/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(parentError, /role="alert"/);
  assert.match(parentError, /reset/);
  assert.match(adminRedirect, /redirect\(`\/installer-review-emerald\/leads\/\$\{encodeURIComponent\(id\)\}`\)/);
  assert.match(dashboardRedirect, /redirect\(`\/installer-review-emerald\/leads\/\$\{encodeURIComponent\(id\)\}`\)/);
  assert.doesNotMatch(adminRedirect + dashboardRedirect, /\/admin\/leads\/\$\{/);
});

test('PR 1 placeholders do not introduce deferred persistence or fabricated counts', () => {
  const root = resolve(process.cwd());
  const content = ['documents', 'activity', 'tasks', 'notes']
    .map((segment) => readFileSync(resolve(root, `app/installer-review-emerald/leads/[id]/${segment}/page.tsx`), 'utf8'))
    .join('\n');
  assert.doesNotMatch(content, /from ['"]@prisma|prisma\.|\.create\(|\.update\(|\.delete\(/i);
  assert.doesNotMatch(content, /\b[1-9][0-9]* (task|document)s?\b/i);
  assert.match(content, /not yet available|later approved release step|later release step/);
});
