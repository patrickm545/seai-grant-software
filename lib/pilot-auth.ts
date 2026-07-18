import { createHmac, randomBytes } from 'node:crypto';
import { verify } from '@node-rs/argon2';
import type { Organisation, OrganisationMembership, PlatformRole, Prisma, PrismaClient, User } from '@prisma/client';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export { hashPilotPassword } from './password-hashing';

export const PILOT_SESSION_COOKIE_NAME = 'solargrant_session';
export const PILOT_SESSION_TTL_SECONDS = 60 * 60 * 12;
export const GENERIC_LOGIN_ERROR = 'Email or password is incorrect, or this account is not available.';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$hpMB+hVoKhULyh0uSi5t6w$w8Pm9XibmLlVU8LPcwA6kZRqTnzU+QlmD+oqiel36p8';

type DbClient = PrismaClient | Prisma.TransactionClient;

type PilotMembership = OrganisationMembership & {
  organisation: Organisation;
};

type PilotUser = User & {
  memberships: PilotMembership[];
};

export type PilotRole = 'OWNER' | 'ADMIN' | 'SALES';

export type PilotContext = {
  userId: string;
  userName: string;
  email: string;
  role: PlatformRole;
  pilotRole: PilotRole;
  membershipId: string;
  isOwner: boolean;
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  organisationType: Organisation['type'];
  actor: {
    actorType: 'human_user';
    userId: string;
    displayName: string;
    email: string;
  };
};

export class PilotAuthenticationError extends Error {
  constructor() {
    super('A valid pilot session is required.');
    this.name = 'PilotAuthenticationError';
  }
}

export function isPilotAuthenticationError(error: unknown): error is PilotAuthenticationError {
  return error instanceof PilotAuthenticationError;
}

export function normalizePilotEmail(email: string) {
  return email.trim().toLowerCase();
}

export function safePilotRedirect(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/admin/dashboard';

  try {
    const url = new URL(value, 'https://solargrant.internal');
    if (url.origin !== 'https://solargrant.internal') return '/admin/dashboard';
    if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) {
      if (!url.pathname.startsWith('/installer-review-emerald')) return '/admin/dashboard';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/admin/dashboard';
  }
}

function getSessionPepper() {
  const pepper = process.env.AUTH_SESSION_PEPPER?.trim();
  if (!pepper || pepper.length < 32) {
    throw new Error('AUTH_SESSION_PEPPER must contain at least 32 characters.');
  }
  return pepper;
}

export function hashSessionToken(token: string) {
  return createHmac('sha256', getSessionPepper()).update(token).digest('hex');
}

function toPilotRole(membership: PilotMembership): PilotRole | null {
  if (membership.isOwner || membership.role === 'ORGANISATION_OWNER') return 'OWNER';
  if (membership.role === 'ORGANISATION_ADMIN') return 'ADMIN';
  if (membership.role === 'ORGANISATION_MEMBER') return 'SALES';
  return null;
}

function resolvePilotContext(user: PilotUser): PilotContext | null {
  if (user.status !== 'ACTIVE' || user.memberships.length !== 1) return null;

  const membership = user.memberships[0];
  const role = toPilotRole(membership);
  if (
    !role ||
    membership.status !== 'ACTIVE' ||
    membership.organisation.type !== 'INSTALLER' ||
    membership.organisation.status !== 'ACTIVE' ||
    !membership.organisation.verified
  ) {
    return null;
  }

  return {
    userId: user.id,
    userName: user.displayName,
    email: user.email,
    role: membership.role,
    pilotRole: role,
    membershipId: membership.id,
    isOwner: membership.isOwner,
    organisationId: membership.organisation.id,
    organisationName: membership.organisation.name,
    organisationSlug: membership.organisation.slug,
    organisationType: membership.organisation.type,
    actor: {
      actorType: 'human_user',
      userId: user.id,
      displayName: user.displayName,
      email: user.email
    }
  };
}

const pilotUserInclude = {
  memberships: {
    include: { organisation: true },
    take: 2
  }
} satisfies Prisma.UserInclude;

export async function authenticatePilotCredentials(args: {
  email: string;
  password: string;
  db?: PrismaClient;
  now?: Date;
}) {
  const { db = prisma, now = new Date() } = args;
  const email = normalizePilotEmail(args.email);
  const user = email
    ? await db.user.findUnique({ where: { email }, include: pilotUserInclude })
    : null;

  let passwordMatches = false;
  try {
    passwordMatches = await verify(user?.passwordHash ?? DUMMY_PASSWORD_HASH, args.password);
  } catch {
    passwordMatches = false;
  }

  const context = user ? resolvePilotContext(user) : null;
  if (!passwordMatches || !user?.passwordHash || !context) return null;

  const sessionToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + PILOT_SESSION_TTL_SECONDS * 1000);
  const tokenHash = hashSessionToken(sessionToken);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now }
    });
    await tx.authSession.create({
      data: { userId: user.id, tokenHash, expiresAt }
    });
  });

  return { context, sessionToken, expiresAt };
}

export async function getPilotContextForSessionToken(args: {
  sessionToken?: string | null;
  db?: DbClient;
  now?: Date;
}) {
  const { sessionToken, db = prisma, now = new Date() } = args;
  if (!sessionToken) return null;

  let tokenHash: string;
  try {
    tokenHash = hashSessionToken(sessionToken);
  } catch {
    return null;
  }

  const session = await db.authSession.findUnique({
    where: { tokenHash },
    include: {
      user: { include: pilotUserInclude }
    }
  });

  if (!session || session.expiresAt <= now) {
    if (session) await db.authSession.delete({ where: { id: session.id } });
    return null;
  }

  return resolvePilotContext(session.user);
}

export async function getCurrentPilotContext() {
  const cookieStore = await cookies();
  return getPilotContextForSessionToken({
    sessionToken: cookieStore.get(PILOT_SESSION_COOKIE_NAME)?.value
  });
}

export async function requirePilotContext() {
  const context = await getCurrentPilotContext();
  if (!context) throw new PilotAuthenticationError();
  return context;
}

export async function invalidatePilotSession(args: {
  sessionToken?: string | null;
  db?: DbClient;
}) {
  const { sessionToken, db = prisma } = args;
  if (!sessionToken) return;

  let tokenHash: string;
  try {
    tokenHash = hashSessionToken(sessionToken);
  } catch {
    return;
  }

  await db.authSession.deleteMany({ where: { tokenHash } });
}

export function pilotSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt
  };
}
