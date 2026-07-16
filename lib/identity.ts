import type { Organisation, OrganisationMembership, PlatformRole, User, Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_INSTALLER_ID, getDefaultInstallerSeedData } from './default-installer';
import { prisma } from './prisma';

export const CLADA_INTERNAL_ORGANISATION_ID = 'org_clada_internal';
export const DEFAULT_ADMIN_USER_ID = 'user_clada_admin';

type DbClient = PrismaClient | Prisma.TransactionClient;

export type ActorContext =
  | {
      actorType: 'human_user';
      userId: string;
      displayName: string;
      email: string;
    }
  | {
      actorType: 'system';
      displayName: string;
    }
  | {
      actorType: 'service';
      displayName: string;
    };

export type OrganisationContext = {
  organisationId: string;
  organisationName: string;
  organisationType: Organisation['type'];
  membershipId: string;
  isOwner: boolean;
  role: PlatformRole;
  actor: ActorContext;
};

export type MembershipWithContext = OrganisationMembership & {
  organisation: Organisation;
  user: User;
};

export type OrganisationContextErrorCode =
  | 'UNAUTHENTICATED'
  | 'MISSING_ACTOR'
  | 'MISSING_ORGANISATION'
  | 'INVALID_MEMBERSHIP'
  | 'INACTIVE_USER'
  | 'INACTIVE_MEMBERSHIP'
  | 'INACTIVE_ORGANISATION';

export class OrganisationContextError extends Error {
  constructor(
    public readonly code: OrganisationContextErrorCode,
    message = 'Organisation context could not be resolved.'
  ) {
    super(message);
    this.name = 'OrganisationContextError';
  }
}

export function isOrganisationContextError(error: unknown): error is OrganisationContextError {
  return error instanceof OrganisationContextError;
}

export function getInstallerOrganisationId(installerId = DEFAULT_INSTALLER_ID) {
  return `org_installer_${installerId}`;
}

export function getDefaultAdminUserSeedData() {
  return {
    id: DEFAULT_ADMIN_USER_ID,
    email: process.env.ADMIN_USER_EMAIL?.trim().toLowerCase() || 'admin@clada.local',
    displayName: process.env.ADMIN_DISPLAY_NAME?.trim() || 'Clada Admin'
  };
}

export function getInternalOrganisationSeedData() {
  return {
    id: CLADA_INTERNAL_ORGANISATION_ID,
    name: process.env.CLADA_INTERNAL_ORGANISATION_NAME?.trim() || 'Clada Systems',
    slug: 'clada-systems',
    type: 'CLADA_INTERNAL' as const
  };
}

export function resolveOrganisationContextFromMembership(
  membership: MembershipWithContext | null | undefined,
  requestedOrganisationId?: string | null
): OrganisationContext {
  if (!requestedOrganisationId) {
    throw new OrganisationContextError('MISSING_ORGANISATION');
  }

  if (!membership || membership.organisationId !== requestedOrganisationId) {
    throw new OrganisationContextError('INVALID_MEMBERSHIP');
  }

  if (membership.user.status !== 'ACTIVE') {
    throw new OrganisationContextError('INACTIVE_USER');
  }

  if (membership.status !== 'ACTIVE') {
    throw new OrganisationContextError('INACTIVE_MEMBERSHIP');
  }

  if (membership.organisation.status !== 'ACTIVE') {
    throw new OrganisationContextError('INACTIVE_ORGANISATION');
  }

  return {
    organisationId: membership.organisation.id,
    organisationName: membership.organisation.name,
    organisationType: membership.organisation.type,
    membershipId: membership.id,
    isOwner: membership.isOwner,
    role: membership.role,
    actor: {
      actorType: 'human_user',
      userId: membership.user.id,
      displayName: membership.user.displayName,
      email: membership.user.email
    }
  };
}

export async function resolveOrganisationContextForUser(args: {
  userId?: string | null;
  organisationId?: string | null;
  db?: DbClient;
}) {
  const { userId, organisationId, db = prisma } = args;

  if (!userId) {
    throw new OrganisationContextError('MISSING_ACTOR');
  }

  if (!organisationId) {
    throw new OrganisationContextError('MISSING_ORGANISATION');
  }

  const membership = await db.organisationMembership.findUnique({
    where: {
      organisationId_userId: {
        organisationId,
        userId
      }
    },
    include: {
      organisation: true,
      user: true
    }
  });

  return resolveOrganisationContextFromMembership(membership, organisationId);
}

export async function ensureInternalIdentityFoundation(db: DbClient = prisma) {
  const organisationSeed = getInternalOrganisationSeedData();
  const userSeed = getDefaultAdminUserSeedData();

  const organisation = await db.organisation.upsert({
    where: { id: organisationSeed.id },
    update: {
      name: organisationSeed.name,
      slug: organisationSeed.slug,
      status: 'ACTIVE'
    },
    create: {
      id: organisationSeed.id,
      name: organisationSeed.name,
      slug: organisationSeed.slug,
      type: organisationSeed.type,
      status: 'ACTIVE',
      verified: true
    }
  });

  const user = await db.user.upsert({
    where: { id: userSeed.id },
    update: {
      email: userSeed.email,
      displayName: userSeed.displayName,
      status: 'ACTIVE'
    },
    create: {
      id: userSeed.id,
      email: userSeed.email,
      displayName: userSeed.displayName,
      status: 'ACTIVE'
    }
  });

  await db.organisationMembership.upsert({
    where: {
      organisationId_userId: {
        organisationId: organisation.id,
        userId: user.id
      }
    },
    update: {
      status: 'ACTIVE',
      isOwner: true,
      role: 'CLADA_INTERNAL_ADMIN'
    },
    create: {
      id: 'membership_clada_admin_internal',
      organisationId: organisation.id,
      userId: user.id,
      status: 'ACTIVE',
      isOwner: true,
      role: 'CLADA_INTERNAL_ADMIN'
    }
  });

  return { organisation, user };
}

export async function ensureInstallerOrganisation(args: {
  db?: DbClient;
  installerId: string;
  installerName: string;
}) {
  const { db = prisma, installerId, installerName } = args;
  const organisationId = getInstallerOrganisationId(installerId);
  const slug = `installer-${installerId}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return db.organisation.upsert({
    where: { id: organisationId },
    update: {
      name: installerName,
      slug,
      status: 'ACTIVE'
    },
    create: {
      id: organisationId,
      name: installerName,
      slug,
      type: 'INSTALLER',
      status: 'ACTIVE',
      verified: false
    }
  });
}

export async function ensureDefaultInstallerWithOrganisation(db: DbClient = prisma) {
  const installerSeed = getDefaultInstallerSeedData();
  const organisation = await ensureInstallerOrganisation({
    db,
    installerId: installerSeed.id,
    installerName: installerSeed.name
  });

  return db.installer.upsert({
    where: { id: installerSeed.id },
    update: {
      organisationId: organisation.id
    },
    create: {
      ...installerSeed,
      organisationId: organisation.id
    },
    include: {
      organisation: true
    }
  });
}

export const systemActor: ActorContext = {
  actorType: 'system',
  displayName: 'Clada OS'
};
