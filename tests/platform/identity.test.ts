import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OrganisationContextError,
  resolveOrganisationContextFromMembership,
  type MembershipWithContext
} from '../../lib/identity';

function activeMembership(overrides: Partial<MembershipWithContext> = {}): MembershipWithContext {
  return {
    id: 'membership-a',
    organisationId: 'org-a',
    userId: 'user-a',
    status: 'ACTIVE',
    isOwner: false,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    updatedAt: new Date('2026-07-10T00:00:00.000Z'),
    organisation: {
      id: 'org-a',
      name: 'Installer A',
      type: 'INSTALLER',
      status: 'ACTIVE',
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      updatedAt: new Date('2026-07-10T00:00:00.000Z')
    },
    user: {
      id: 'user-a',
      email: 'admin@example.test',
      displayName: 'Admin User',
      status: 'ACTIVE',
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      updatedAt: new Date('2026-07-10T00:00:00.000Z')
    },
    ...overrides
  };
}

function assertContextError(fn: () => unknown, code: OrganisationContextError['code']) {
  assert.throws(fn, (error) => error instanceof OrganisationContextError && error.code === code);
}

test('resolves valid user and organisation membership context', () => {
  const context = resolveOrganisationContextFromMembership(activeMembership(), 'org-a');

  assert.equal(context.organisationId, 'org-a');
  assert.equal(context.organisationType, 'INSTALLER');
  assert.equal(context.actor.actorType, 'human_user');
  assert.equal(context.actor.userId, 'user-a');
});

test('rejects missing organisation context', () => {
  assertContextError(() => resolveOrganisationContextFromMembership(activeMembership(), null), 'MISSING_ORGANISATION');
});

test('rejects client-supplied organisation without matching membership', () => {
  assertContextError(() => resolveOrganisationContextFromMembership(activeMembership(), 'org-b'), 'INVALID_MEMBERSHIP');
});

test('rejects inactive users', () => {
  const membership = activeMembership({
    user: {
      ...activeMembership().user,
      status: 'INACTIVE'
    }
  });

  assertContextError(() => resolveOrganisationContextFromMembership(membership, 'org-a'), 'INACTIVE_USER');
});

test('rejects inactive membership or organisation context', () => {
  assertContextError(
    () => resolveOrganisationContextFromMembership(activeMembership({ status: 'INACTIVE' }), 'org-a'),
    'INACTIVE_ORGANISATION'
  );

  const inactiveOrganisation = activeMembership({
    organisation: {
      ...activeMembership().organisation,
      status: 'INACTIVE'
    }
  });

  assertContextError(() => resolveOrganisationContextFromMembership(inactiveOrganisation, 'org-a'), 'INACTIVE_ORGANISATION');
});
