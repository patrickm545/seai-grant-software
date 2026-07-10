import type { PlatformRole } from '@prisma/client';
import type { OrganisationContext } from './identity';

export const platformPermissions = [
  'lead.read',
  'lead.update',
  'lead.delete',
  'lead.assign',
  'lead.change_status',
  'lead.export',
  'document.read',
  'document.review',
  'organisation.manage_members',
  'audit.read',
  'installer.manage_quote_pricing',
  'portal_token.manage'
] as const;

export type PlatformPermission = (typeof platformPermissions)[number];

const platformPermissionSet = new Set<string>(platformPermissions);

export const rolePermissionMap: Record<PlatformRole, readonly PlatformPermission[]> = {
  ORGANISATION_OWNER: platformPermissions,
  ORGANISATION_ADMIN: [
    'lead.read',
    'lead.update',
    'lead.delete',
    'lead.assign',
    'lead.change_status',
    'lead.export',
    'document.read',
    'document.review',
    'audit.read',
    'installer.manage_quote_pricing',
    'portal_token.manage'
  ],
  ORGANISATION_MEMBER: ['lead.read', 'document.read'],
  CLADA_INTERNAL_ADMIN: [
    'lead.read',
    'lead.update',
    'lead.delete',
    'lead.assign',
    'lead.change_status',
    'lead.export',
    'document.read',
    'document.review',
    'organisation.manage_members',
    'audit.read',
    'installer.manage_quote_pricing',
    'portal_token.manage'
  ],
  CLADA_INTERNAL_SUPPORT: ['lead.read', 'document.read', 'audit.read'],
  SERVICE_ACTOR: [],
  SYSTEM_ACTOR: []
};

export type AuthorizationErrorCode =
  | 'MISSING_CONTEXT'
  | 'UNKNOWN_PERMISSION'
  | 'PERMISSION_DENIED';

export class AuthorizationError extends Error {
  constructor(
    public readonly code: AuthorizationErrorCode,
    message = 'Action is not authorised.'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function isPlatformPermission(value: string): value is PlatformPermission {
  return platformPermissionSet.has(value);
}

export function getEffectivePermissions(context: OrganisationContext | null | undefined): readonly PlatformPermission[] {
  if (!context) return [];
  return rolePermissionMap[context.role] ?? [];
}

export function hasPermission(
  context: OrganisationContext | null | undefined,
  permission: PlatformPermission
) {
  if (!isPlatformPermission(permission)) return false;
  return getEffectivePermissions(context).includes(permission);
}

export function requirePermission(
  context: OrganisationContext | null | undefined,
  permission: PlatformPermission
): asserts context is OrganisationContext {
  if (!context) {
    throw new AuthorizationError('MISSING_CONTEXT');
  }

  if (!isPlatformPermission(permission)) {
    throw new AuthorizationError('UNKNOWN_PERMISSION');
  }

  if (!hasPermission(context, permission)) {
    throw new AuthorizationError('PERMISSION_DENIED');
  }
}
