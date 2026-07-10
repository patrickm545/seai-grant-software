import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrganisationContext } from '../../lib/identity';
import {
  AuthorizationError,
  getEffectivePermissions,
  hasPermission,
  isPlatformPermission,
  platformPermissions,
  requirePermission,
  rolePermissionMap
} from '../../lib/permissions';

function context(role: OrganisationContext['role']): OrganisationContext {
  return {
    organisationId: 'org-a',
    organisationName: 'Installer A',
    organisationType: 'INSTALLER',
    membershipId: 'membership-a',
    isOwner: role === 'ORGANISATION_OWNER',
    role,
    actor: {
      actorType: 'human_user',
      userId: 'user-a',
      displayName: 'Admin User',
      email: 'admin@example.test'
    }
  };
}

test('permission catalogue has unique lower-case dotted names', () => {
  assert.equal(new Set(platformPermissions).size, platformPermissions.length);

  for (const permission of platformPermissions) {
    assert.match(permission, /^[a-z]+(?:_[a-z]+)?\.[a-z]+(?:_[a-z]+)*$/);
    assert.ok(isPlatformPermission(permission));
  }
});

test('role mappings only reference known permissions', () => {
  for (const permissions of Object.values(rolePermissionMap)) {
    for (const permission of permissions) {
      assert.ok(isPlatformPermission(permission));
    }
  }
});

test('organisation admin can change lead status but member cannot', () => {
  assert.equal(hasPermission(context('ORGANISATION_ADMIN'), 'lead.change_status'), true);
  assert.equal(hasPermission(context('ORGANISATION_MEMBER'), 'lead.change_status'), false);
  assert.equal(hasPermission(context('ORGANISATION_MEMBER'), 'lead.read'), true);
});

test('missing context defaults to no permissions and denial', () => {
  assert.deepEqual(getEffectivePermissions(null), []);
  assert.throws(
    () => requirePermission(null, 'lead.change_status'),
    (error) => error instanceof AuthorizationError && error.code === 'MISSING_CONTEXT'
  );
});

test('client-supplied permission values do not affect effective permissions', () => {
  const tamperedContext = {
    ...context('ORGANISATION_MEMBER'),
    permissions: ['lead.change_status']
  };

  assert.throws(
    () => requirePermission(tamperedContext, 'lead.change_status'),
    (error) => error instanceof AuthorizationError && error.code === 'PERMISSION_DENIED'
  );
});
