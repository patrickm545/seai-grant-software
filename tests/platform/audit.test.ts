import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrganisationContext } from '../../lib/identity';
import { buildAuditActorFromContext, sanitizeAuditMetadata } from '../../lib/audit';

const context: OrganisationContext = {
  organisationId: 'org-a',
  organisationName: 'Installer A',
  organisationType: 'INSTALLER',
  membershipId: 'membership-a',
  isOwner: false,
  role: 'ORGANISATION_ADMIN',
  actor: {
    actorType: 'human_user',
    userId: 'user-a',
    displayName: 'Admin User',
    email: 'admin@example.test'
  }
};

test('builds audit actor from organisation context', () => {
  const actor = buildAuditActorFromContext(context);

  assert.deepEqual(actor, {
    actor: 'Admin User',
    actorType: 'HUMAN_USER',
    userId: 'user-a',
    membershipId: 'membership-a',
    organisationId: 'org-a'
  });
});

test('sanitises sensitive audit metadata recursively', () => {
  const sanitized = sanitizeAuditMetadata({
    safe: 'kept',
    portalToken: 'secret-token',
    nested: {
      password: 'hidden',
      value: 'visible',
      documentContents: 'full document text'
    },
    list: [
      {
        apiSecret: 'hidden',
        count: 1
      }
    ]
  });

  assert.deepEqual(sanitized, {
    safe: 'kept',
    nested: {
      value: 'visible'
    },
    list: [
      {
        count: 1
      }
    ]
  });
});
