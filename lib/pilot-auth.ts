import { createHmac, randomBytes } from 'node:crypto';
import { verify } from '@node-rs/argon2';
import type {
  Organisation,
  OrganisationMembership,
  PlatformRole,
  Prisma,
  PrismaClient,
  User
} from '@prisma/client';
import { cookies } from 'next/headers';
import { writeAuditEvent } from './audit';
import { hashPilotPassword } from './password-hashing';
import { prisma } from './prisma';

export { hashPilotPassword } from './password-hashing';

export const PILOT_SESSION_COOKIE_NAME = 'solargrant_session';
export const PILOT_SESSION_TTL_SECONDS = 60 * 60 * 12;
export const RESTRICTED_SESSION_TTL_SECONDS = 60 * 30;
export const GENERIC_LOGIN_ERROR = 'Email or password is incorrect, or this account is not available.';
export const PASSWORD_CHANGE_REQUIRED_CODE = 'PASSWORD_CHANGE_REQUIRED';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$hpMB+hVoKhULyh0uSi5t6w$w8Pm9XibmLlVU8LPcwA6kZRqTnzU+QlmD+oqiel36p8';

type DbClient = PrismaClient | Prisma.TransactionClient;

type PilotOrganisation = Organisation & {
  provisioningOperations: Array<{
    id: string;
    operationType: string;
    resultSnapshot: Prisma.JsonValue | null;
  }>;
};

type PilotMembership = OrganisationMembership & {
  organisation: PilotOrganisation;
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

export type RestrictedFirstLoginContext = {
  userId: string;
  userName: string;
  email: string;
  role: 'ORGANISATION_OWNER';
  pilotRole: 'OWNER';
  membershipId: string;
  isOwner: true;
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  organisationType: 'INSTALLER';
  provisioningOperationId: string;
  recoveryMode: 'PROVISIONING_ACTIVATION' | 'ACTIVE_LEGACY_RECOVERY';
  temporaryCredentialExpiresAt: Date;
  actor: {
    actorType: 'human_user';
    userId: string;
    displayName: string;
    email: string;
  };
};

export type PilotSessionState =
  | { kind: 'NORMAL'; context: PilotContext }
  | { kind: 'RESTRICTED_FIRST_LOGIN'; context: RestrictedFirstLoginContext };

export class PilotAuthenticationError extends Error {
  readonly code: 'UNAUTHENTICATED' | typeof PASSWORD_CHANGE_REQUIRED_CODE;

  constructor(code: 'UNAUTHENTICATED' | typeof PASSWORD_CHANGE_REQUIRED_CODE = 'UNAUTHENTICATED') {
    super(code === PASSWORD_CHANGE_REQUIRED_CODE ? 'Password change is required.' : 'A valid pilot session is required.');
    this.name = 'PilotAuthenticationError';
    this.code = code;
  }
}

export function isPilotAuthenticationError(error: unknown): error is PilotAuthenticationError {
  return error instanceof PilotAuthenticationError;
}

export function isPasswordChangeRequiredError(error: unknown) {
  return isPilotAuthenticationError(error) && error.code === PASSWORD_CHANGE_REQUIRED_CODE;
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

function hasApprovedProvisioning(organisation: PilotOrganisation) {
  return organisation.provisioningOperations.length === 1;
}

function resolvePilotContext(user: PilotUser): PilotContext | null {
  if (user.status !== 'ACTIVE' || user.mustChangePassword || user.memberships.length !== 1) return null;

  const membership = user.memberships[0];
  const role = toPilotRole(membership);
  if (
    !role ||
    membership.status !== 'ACTIVE' ||
    membership.organisation.type !== 'INSTALLER' ||
    membership.organisation.status !== 'ACTIVE' ||
    (!membership.organisation.verified && !hasApprovedProvisioning(membership.organisation))
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

function resolveRestrictedFirstLoginContext(user: PilotUser, now: Date): RestrictedFirstLoginContext | null {
  if (
    !user.mustChangePassword ||
    !user.passwordHash ||
    !user.temporaryCredentialExpiresAt ||
    user.temporaryCredentialExpiresAt <= now ||
    user.memberships.length !== 1
  ) {
    return null;
  }

  const membership = user.memberships[0];
  const operation = membership.organisation.provisioningOperations.find((candidate) => {
    if (candidate.operationType !== 'RECOVERY_CREDENTIAL_REISSUE') return user.status === 'INVITED';
    const snapshot = candidate.resultSnapshot;
    return Boolean(
      snapshot &&
        typeof snapshot === 'object' &&
        !Array.isArray(snapshot) &&
        (snapshot as Record<string, unknown>).userId === user.id &&
        (user.status === 'INVITED' ||
          (snapshot as Record<string, unknown>).recoveryMode === 'ACTIVE_LEGACY_PRODUCTION')
    );
  });
  const role = toPilotRole(membership);
  const provisioningActivation =
    user.status === 'INVITED' &&
    membership.isOwner &&
    membership.role === 'ORGANISATION_OWNER' &&
    membership.organisation.status === 'PROVISIONING';
  const activeLegacyRecovery =
    user.status === 'ACTIVE' &&
    membership.isOwner &&
    membership.role === 'ORGANISATION_OWNER' &&
    membership.organisation.status === 'ACTIVE' &&
    membership.organisation.verified &&
    operation?.operationType === 'RECOVERY_CREDENTIAL_REISSUE';
  if (
    membership.status !== 'ACTIVE' ||
    !role ||
    membership.organisation.type !== 'INSTALLER' ||
    !operation ||
    (!provisioningActivation && !activeLegacyRecovery)
  ) {
    return null;
  }

  return {
    userId: user.id,
    userName: user.displayName,
    email: user.email,
    role: 'ORGANISATION_OWNER',
    pilotRole: 'OWNER',
    membershipId: membership.id,
    isOwner: true,
    organisationId: membership.organisation.id,
    organisationName: membership.organisation.name,
    organisationSlug: membership.organisation.slug,
    organisationType: 'INSTALLER',
    provisioningOperationId: operation.id,
    recoveryMode: activeLegacyRecovery ? 'ACTIVE_LEGACY_RECOVERY' : 'PROVISIONING_ACTIVATION',
    temporaryCredentialExpiresAt: user.temporaryCredentialExpiresAt,
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
    include: {
      organisation: {
        include: {
          provisioningOperations: {
            where: {
              status: 'COMPLETED',
              approvedBy: { not: null },
              approvedAt: { not: null }
            },
            orderBy: { completedAt: 'desc' },
            select: { id: true, operationType: true, resultSnapshot: true },
            take: 1
          }
        }
      }
    },
    take: 2
  }
} satisfies Prisma.UserInclude;

async function recordCredentialExpired(db: DbClient, user: PilotUser) {
  const membership = user.memberships[0];
  if (!membership) return;
  try {
    await writeAuditEvent(db, {
      organisationId: membership.organisationId,
      action: 'CREDENTIAL_EXPIRED',
      actor: user.displayName,
      actorType: 'HUMAN_USER',
      userId: user.id,
      membershipId: membership.id,
      resourceType: 'user',
      resourceId: user.id,
      provisioningOperationId: membership.organisation.provisioningOperations[0]?.id,
      source: 'FIRST_LOGIN',
      outcome: 'DENIED',
      metadata: { reasonCode: 'TEMPORARY_CREDENTIAL_EXPIRED' }
    });
  } catch {
    // A generic rejected login must not become distinguishable because safe audit storage is unavailable.
  }
}

class PilotCredentialStateError extends Error {}

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

  if (!passwordMatches || !user?.passwordHash) return null;

  const normalContext = resolvePilotContext(user);
  const restrictedContext = resolveRestrictedFirstLoginContext(user, now);
  if (!normalContext && !restrictedContext) {
    if (
      ['INVITED', 'ACTIVE'].includes(user.status) &&
      user.mustChangePassword &&
      user.temporaryCredentialExpiresAt &&
      user.temporaryCredentialExpiresAt <= now
    ) {
      await recordCredentialExpired(db, user);
    }
    return null;
  }

  const sessionToken = randomBytes(32).toString('base64url');
  const sessionTtl = restrictedContext ? RESTRICTED_SESSION_TTL_SECONDS : PILOT_SESSION_TTL_SECONDS;
  const requestedExpiry = new Date(now.getTime() + sessionTtl * 1000);
  const expiresAt = restrictedContext && restrictedContext.temporaryCredentialExpiresAt < requestedExpiry
    ? restrictedContext.temporaryCredentialExpiresAt
    : requestedExpiry;
  const tokenHash = hashSessionToken(sessionToken);

  if (restrictedContext) {
    try {
      await db.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
          include: pilotUserInclude
        });
        const currentContext = currentUser ? resolveRestrictedFirstLoginContext(currentUser, now) : null;
        if (
          !currentUser ||
          !currentContext ||
          currentUser.passwordHash !== user.passwordHash ||
          currentContext.organisationId !== restrictedContext.organisationId
        ) {
          throw new PilotCredentialStateError();
        }

        await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
        await tx.authSession.create({
          data: {
            userId: user.id,
            tokenHash,
            sessionType: 'RESTRICTED_FIRST_LOGIN',
            expiresAt
          }
        });

        const auditBase = {
          organisationId: restrictedContext.organisationId,
          actor: restrictedContext.userName,
          actorType: 'HUMAN_USER' as const,
          userId: restrictedContext.userId,
          membershipId: restrictedContext.membershipId,
          resourceType: 'user',
          resourceId: restrictedContext.userId,
          provisioningOperationId: restrictedContext.provisioningOperationId,
          source: 'FIRST_LOGIN'
        };
        await writeAuditEvent(tx, { ...auditBase, action: 'INVITED_LOGIN_SUCCEEDED' });
        await writeAuditEvent(tx, {
          ...auditBase,
          action: 'RESTRICTED_SESSION_CREATED',
          resourceType: 'auth_session',
          metadata: { sessionType: 'RESTRICTED_FIRST_LOGIN', expiresAt: expiresAt.toISOString() }
        });
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof PilotCredentialStateError) return null;
      throw error;
    }
  } else {
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
      await tx.authSession.create({
        data: {
          userId: user.id,
          tokenHash,
          sessionType: 'NORMAL',
          expiresAt
        }
      });
    });
  }

  return {
    context: (normalContext ?? restrictedContext)!,
    sessionKind: restrictedContext ? 'RESTRICTED_FIRST_LOGIN' as const : 'NORMAL' as const,
    sessionToken,
    expiresAt
  };
}

/*
 * Restricted and normal session resolution deliberately share one lookup so
 * every server boundary evaluates the durable session type and current
 * lifecycle state together.
 */

export async function getPilotSessionStateForSessionToken(args: {
  sessionToken?: string | null;
  db?: DbClient;
  now?: Date;
}): Promise<PilotSessionState | null> {
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
    include: { user: { include: pilotUserInclude } }
  });

  if (!session || session.expiresAt <= now) {
    if (session) await db.authSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (session.sessionType === 'NORMAL') {
    const context = resolvePilotContext(session.user);
    if (context) return { kind: 'NORMAL', context };
  } else {
    const context = resolveRestrictedFirstLoginContext(session.user, now);
    if (context && session.expiresAt <= context.temporaryCredentialExpiresAt) {
      return { kind: 'RESTRICTED_FIRST_LOGIN', context };
    }
  }

  await db.authSession.deleteMany({ where: { id: session.id } });
  return null;
}

export async function getPilotContextForSessionToken(args: {
  sessionToken?: string | null;
  db?: DbClient;
  now?: Date;
}) {
  const state = await getPilotSessionStateForSessionToken(args);
  return state?.kind === 'NORMAL' ? state.context : null;
}

export async function getCurrentPilotSessionState() {
  const cookieStore = await cookies();
  return getPilotSessionStateForSessionToken({
    sessionToken: cookieStore.get(PILOT_SESSION_COOKIE_NAME)?.value
  });
}

export async function getCurrentPilotContext() {
  const state = await getCurrentPilotSessionState();
  return state?.kind === 'NORMAL' ? state.context : null;
}

export async function requirePilotContext() {
  const state = await getCurrentPilotSessionState();
  if (state?.kind === 'NORMAL') return state.context;
  if (state?.kind === 'RESTRICTED_FIRST_LOGIN') {
    throw new PilotAuthenticationError(PASSWORD_CHANGE_REQUIRED_CODE);
  }
  throw new PilotAuthenticationError();
}

export type FirstLoginPasswordErrorCode =
  | 'CURRENT_CREDENTIAL_INVALID'
  | 'PASSWORD_CONFIRMATION_MISMATCH'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_TOO_WEAK'
  | 'PASSWORD_CONTEXT_DERIVED'
  | 'PASSWORD_REUSES_TEMPORARY_CREDENTIAL'
  | 'RESTRICTED_SESSION_REQUIRED'
  | 'ACTIVATION_STATE_INVALID'
  | 'ACTIVATION_UNAVAILABLE';

export function firstLoginPasswordErrorMessage(code: FirstLoginPasswordErrorCode) {
  switch (code) {
    case 'CURRENT_CREDENTIAL_INVALID':
      return 'The temporary credential is not valid. Sign in again and retry.';
    case 'PASSWORD_CONFIRMATION_MISMATCH':
      return 'The new passwords do not match.';
    case 'PASSWORD_TOO_SHORT':
      return 'Choose a password with at least 12 characters.';
    case 'PASSWORD_TOO_LONG':
      return 'Choose a password with no more than 128 characters.';
    case 'PASSWORD_TOO_WEAK':
      return 'Choose a less common, less predictable password.';
    case 'PASSWORD_CONTEXT_DERIVED':
      return 'Do not include your name, email, organisation name, or organisation slug.';
    case 'PASSWORD_REUSES_TEMPORARY_CREDENTIAL':
      return 'Choose a password different from the temporary credential.';
    case 'RESTRICTED_SESSION_REQUIRED':
      return 'Your secure first-login session has expired. Sign in again to continue.';
    case 'ACTIVATION_STATE_INVALID':
      return 'This account is not available for first-login activation.';
    default:
      return 'Password replacement is temporarily unavailable. Please try again.';
  }
}

const commonPasswordFragments = [
  'password',
  'passw0rd',
  'qwerty',
  'letmein',
  'welcome',
  'changeme',
  'temporary',
  'solargrant',
  'cladasystems'
];

function comparablePasswordValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function validateFirstLoginPassword(input: {
  newPassword: string;
  confirmation: string;
  email: string;
  userName: string;
  organisationName: string;
  organisationSlug: string;
}): FirstLoginPasswordErrorCode | null {
  if (input.newPassword !== input.confirmation) return 'PASSWORD_CONFIRMATION_MISMATCH';
  if (input.newPassword.length < 12) return 'PASSWORD_TOO_SHORT';
  if (input.newPassword.length > 128) return 'PASSWORD_TOO_LONG';

  const comparable = comparablePasswordValue(input.newPassword);
  if (
    commonPasswordFragments.some((fragment) => comparable.includes(fragment)) ||
    /^(.)\1{11,}$/i.test(input.newPassword) ||
    comparable.includes('123456') ||
    comparable.includes('abcdef')
  ) {
    return 'PASSWORD_TOO_WEAK';
  }

  const contextTokens = [
    input.email.split('@')[0],
    input.userName,
    input.organisationName,
    input.organisationSlug
  ]
    .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
    .map(comparablePasswordValue)
    .filter((value) => value.length >= 4);
  if (contextTokens.some((value) => comparable.includes(value))) return 'PASSWORD_CONTEXT_DERIVED';

  return null;
}

class FirstLoginActivationError extends Error {
  constructor(readonly code: FirstLoginPasswordErrorCode) {
    super(code);
  }
}

async function recordActivationFailure(
  db: PrismaClient,
  context: RestrictedFirstLoginContext,
  code: FirstLoginPasswordErrorCode
) {
  try {
    await writeAuditEvent(db, {
      organisationId: context.organisationId,
      action: 'FIRST_LOGIN_ACTIVATION_FAILED',
      actor: context.userName,
      actorType: 'HUMAN_USER',
      userId: context.userId,
      membershipId: context.membershipId,
      resourceType: 'user',
      resourceId: context.userId,
      provisioningOperationId: context.provisioningOperationId,
      source: 'FIRST_LOGIN',
      outcome: 'FAILED',
      metadata: { reasonCode: code }
    });
  } catch {
    // Failure evidence is best effort after a rejected transaction; no secret is attached.
  }
}

export async function completePilotFirstLogin(args: {
  sessionToken?: string | null;
  currentCredential: string;
  newPassword: string;
  confirmation: string;
  db?: PrismaClient;
  now?: Date;
}) {
  const { db = prisma, now = new Date() } = args;
  if (!args.sessionToken) return { ok: false as const, code: 'RESTRICTED_SESSION_REQUIRED' as const };

  let tokenHash: string;
  try {
    tokenHash = hashSessionToken(args.sessionToken);
  } catch {
    return { ok: false as const, code: 'RESTRICTED_SESSION_REQUIRED' as const };
  }

  const candidate = await db.authSession.findUnique({
    where: { tokenHash },
    include: { user: { include: pilotUserInclude } }
  });
  const context = candidate ? resolveRestrictedFirstLoginContext(candidate.user, now) : null;
  if (
    !candidate ||
    candidate.sessionType !== 'RESTRICTED_FIRST_LOGIN' ||
    candidate.expiresAt <= now ||
    !context ||
    candidate.expiresAt > context.temporaryCredentialExpiresAt
  ) {
    return { ok: false as const, code: 'RESTRICTED_SESSION_REQUIRED' as const };
  }

  const policyError = validateFirstLoginPassword({
    newPassword: args.newPassword,
    confirmation: args.confirmation,
    email: context.email,
    userName: context.userName,
    organisationName: context.organisationName,
    organisationSlug: context.organisationSlug
  });
  if (policyError) {
    await recordActivationFailure(db, context, policyError);
    return { ok: false as const, code: policyError };
  }

  let currentCredentialMatches = false;
  let reusesTemporaryCredential = false;
  try {
    currentCredentialMatches = await verify(candidate.user.passwordHash ?? DUMMY_PASSWORD_HASH, args.currentCredential);
    reusesTemporaryCredential = await verify(candidate.user.passwordHash ?? DUMMY_PASSWORD_HASH, args.newPassword);
  } catch {
    currentCredentialMatches = false;
  }
  if (!currentCredentialMatches) {
    await recordActivationFailure(db, context, 'CURRENT_CREDENTIAL_INVALID');
    return { ok: false as const, code: 'CURRENT_CREDENTIAL_INVALID' as const };
  }
  if (reusesTemporaryCredential) {
    await recordActivationFailure(db, context, 'PASSWORD_REUSES_TEMPORARY_CREDENTIAL');
    return { ok: false as const, code: 'PASSWORD_REUSES_TEMPORARY_CREDENTIAL' as const };
  }

  const previousPasswordHash = candidate.user.passwordHash;
  if (!previousPasswordHash) {
    await recordActivationFailure(db, context, 'ACTIVATION_STATE_INVALID');
    return { ok: false as const, code: 'ACTIVATION_STATE_INVALID' as const };
  }

  const replacementHash = await hashPilotPassword(args.newPassword);
  const normalSessionToken = randomBytes(32).toString('base64url');
  const normalTokenHash = hashSessionToken(normalSessionToken);
  const normalExpiresAt = new Date(now.getTime() + PILOT_SESSION_TTL_SECONDS * 1000);

  try {
    await db.$transaction(async (tx) => {
      const currentSession = await tx.authSession.findUnique({
        where: { tokenHash },
        include: { user: { include: pilotUserInclude } }
      });
      const currentContext = currentSession ? resolveRestrictedFirstLoginContext(currentSession.user, now) : null;
      if (
        !currentSession ||
        currentSession.sessionType !== 'RESTRICTED_FIRST_LOGIN' ||
        currentSession.expiresAt <= now ||
        !currentContext ||
        currentSession.user.passwordHash !== previousPasswordHash ||
        currentContext.userId !== context.userId ||
        currentContext.organisationId !== context.organisationId
      ) {
        throw new FirstLoginActivationError('ACTIVATION_STATE_INVALID');
      }

      const userUpdate = await tx.user.updateMany({
        where: {
          id: context.userId,
          status:
            context.recoveryMode === 'ACTIVE_LEGACY_RECOVERY'
              ? 'ACTIVE'
              : 'INVITED',
          mustChangePassword: true,
          passwordHash: previousPasswordHash,
          temporaryCredentialExpiresAt: { gt: now }
        },
        data: {
          passwordHash: replacementHash,
          status: 'ACTIVE',
          mustChangePassword: false,
          temporaryCredentialExpiresAt: null,
          lastLoginAt: now
        }
      });
      if (userUpdate.count !== 1) throw new FirstLoginActivationError('ACTIVATION_STATE_INVALID');

      if (context.recoveryMode === 'PROVISIONING_ACTIVATION') {
        const organisationUpdate = await tx.organisation.updateMany({
          where: { id: context.organisationId, status: 'PROVISIONING' },
          data: { status: 'ACTIVE' }
        });
        if (organisationUpdate.count !== 1) throw new FirstLoginActivationError('ACTIVATION_STATE_INVALID');
      } else {
        const activeOrganisation = await tx.organisation.count({
          where: {
            id: context.organisationId,
            status: 'ACTIVE',
            type: 'INSTALLER',
            verified: true
          }
        });
        if (activeOrganisation !== 1) throw new FirstLoginActivationError('ACTIVATION_STATE_INVALID');
      }

      const revoked = await tx.authSession.deleteMany({ where: { userId: context.userId } });
      await tx.authSession.create({
        data: {
          userId: context.userId,
          tokenHash: normalTokenHash,
          sessionType: 'NORMAL',
          expiresAt: normalExpiresAt
        }
      });

      const auditBase = {
        organisationId: context.organisationId,
        actor: context.userName,
        actorType: 'HUMAN_USER' as const,
        userId: context.userId,
        membershipId: context.membershipId,
        resourceId: context.userId,
        provisioningOperationId: context.provisioningOperationId,
        source: 'FIRST_LOGIN'
      };
      await writeAuditEvent(tx, { ...auditBase, action: 'PASSWORD_CHANGED', resourceType: 'user' });
      if (context.recoveryMode === 'PROVISIONING_ACTIVATION') {
        await writeAuditEvent(tx, { ...auditBase, action: 'USER_ACTIVATED', resourceType: 'user' });
        await writeAuditEvent(tx, {
          ...auditBase,
          action: 'ORGANISATION_ACTIVATED',
          resourceType: 'organisation',
          resourceId: context.organisationId
        });
      } else {
        await writeAuditEvent(tx, {
          ...auditBase,
          action: 'LEGACY_CREDENTIAL_RECOVERY_COMPLETED',
          resourceType: 'user'
        });
      }
      await writeAuditEvent(tx, {
        ...auditBase,
        action: 'SESSIONS_INVALIDATED',
        resourceType: 'auth_session',
        metadata: { revokedSessionCount: revoked.count }
      });
      await writeAuditEvent(tx, {
        ...auditBase,
        action: 'NORMAL_SESSION_CREATED',
        resourceType: 'auth_session',
        metadata: { sessionType: 'NORMAL', expiresAt: normalExpiresAt.toISOString() }
      });
      await writeAuditEvent(tx, { ...auditBase, action: 'FIRST_LOGIN_COMPLETED', resourceType: 'user' });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    const code = error instanceof FirstLoginActivationError ? error.code : 'ACTIVATION_UNAVAILABLE';
    await recordActivationFailure(db, context, code);
    return { ok: false as const, code };
  }

  return {
    ok: true as const,
    sessionToken: normalSessionToken,
    expiresAt: normalExpiresAt,
    redirectTo: '/admin/dashboard'
  };
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
