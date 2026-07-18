import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, test } from 'node:test';
import { verify } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import {
  authenticatePilotCredentials,
  completePilotFirstLogin,
  getPilotContextForSessionToken,
  getPilotSessionStateForSessionToken,
  hashPilotPassword,
  hashSessionToken,
  RESTRICTED_SESSION_TTL_SECONDS
} from '../../lib/pilot-auth';

process.env.AUTH_SESSION_PEPPER = 'tenant-first-login-integration-pepper-2026';

const prisma = new PrismaClient();
const suffix = `first-login-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const organisationIds: string[] = [];
const userIds: string[] = [];
const temporaryCredentials = new Set<string>();
const replacementPasswords = new Set<string>();
const replacementPasswordsByLabel = new Map<string, string>();
const baseNow = new Date('2026-07-18T15:00:00.000Z');
let approverId = '';

type InvitedFixture = Awaited<ReturnType<typeof createInvitedOwner>>;

async function createInvitedOwner(label: string, input?: { credentialExpiresAt?: Date }) {
  const credential = `Temp!${randomBytes(24).toString('base64url')}`;
  temporaryCredentials.add(credential);
  const organisation = await prisma.organisation.create({
    data: {
      name: `Northstar ${label}`,
      slug: `${suffix}-${label}`,
      type: 'INSTALLER',
      status: 'PROVISIONING',
      verified: false
    }
  });
  organisationIds.push(organisation.id);
  await prisma.installer.create({
    data: {
      organisationId: organisation.id,
      name: `Northstar ${label}`,
      slug: `${suffix}-${label}`,
      seaiCompanyId: `SEAI-${suffix}-${label}`
    }
  });
  const user = await prisma.user.create({
    data: {
      email: `${suffix}-${label}@example.test`,
      displayName: `Owner ${label}`,
      passwordHash: await hashPilotPassword(credential),
      status: 'INVITED',
      mustChangePassword: true,
      temporaryCredentialExpiresAt: input?.credentialExpiresAt ?? new Date(baseNow.getTime() + 24 * 60 * 60 * 1000)
    }
  });
  userIds.push(user.id);
  const membership = await prisma.organisationMembership.create({
    data: {
      organisationId: organisation.id,
      userId: user.id,
      status: 'ACTIVE',
      isOwner: true,
      role: 'ORGANISATION_OWNER'
    }
  });
  const operation = await prisma.provisioningOperation.create({
    data: {
      idempotencyKey: `${suffix}-${label}`,
      inputHash: randomBytes(32).toString('hex'),
      status: 'COMPLETED',
      organisationId: organisation.id,
      approvedBy: approverId,
      approvedAt: new Date(baseNow.getTime() - 60_000),
      completedAt: new Date(baseNow.getTime() - 30_000)
    }
  });
  return { credential, organisation, user, membership, operation };
}

async function restrictedLogin(fixture: InvitedFixture, now = baseNow) {
  const result = await authenticatePilotCredentials({
    email: fixture.user.email,
    password: fixture.credential,
    db: prisma,
    now
  });
  assert.ok(result);
  assert.equal(result.sessionKind, 'RESTRICTED_FIRST_LOGIN');
  return result;
}

function replacementPassword(label: string) {
  const existing = replacementPasswordsByLabel.get(label);
  if (existing) return existing;
  const value = `Maple!River!Orbit!47-${randomBytes(8).toString('base64url')}`;
  replacementPasswordsByLabel.set(label, value);
  replacementPasswords.add(value);
  return value;
}

before(async () => {
  await prisma.$connect();
  const internalOrganisation = await prisma.organisation.create({
    data: {
      name: `Clada Internal ${suffix}`,
      slug: `${suffix}-internal`,
      type: 'CLADA_INTERNAL',
      status: 'ACTIVE',
      verified: true
    }
  });
  organisationIds.push(internalOrganisation.id);
  const approver = await prisma.user.create({
    data: {
      email: `${suffix}-approver@example.test`,
      displayName: 'Approved Internal Operator',
      passwordHash: await hashPilotPassword(`Approver!${randomBytes(24).toString('base64url')}`),
      status: 'ACTIVE'
    }
  });
  approverId = approver.id;
  userIds.push(approver.id);
  await prisma.organisationMembership.create({
    data: {
      organisationId: internalOrganisation.id,
      userId: approver.id,
      status: 'ACTIVE',
      role: 'CLADA_INTERNAL_ADMIN'
    }
  });
});

after(async () => {
  await prisma.auditLog.deleteMany({
    where: { OR: [{ organisationId: { in: organisationIds } }, { userId: { in: userIds } }] }
  });
  await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.provisioningOperation.deleteMany({ where: { organisationId: { in: organisationIds } } });
  await prisma.organisationMembership.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.installer.deleteMany({ where: { organisationId: { in: organisationIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organisation.deleteMany({ where: { id: { in: organisationIds } } });
  await prisma.$disconnect();
});

test('valid invited-owner credentials create only a 30-minute restricted session', async () => {
  const fixture = await createInvitedOwner('restricted');
  const result = await restrictedLogin(fixture);
  assert.equal(result.expiresAt.getTime(), baseNow.getTime() + RESTRICTED_SESSION_TTL_SECONDS * 1000);
  assert.equal(await getPilotContextForSessionToken({ sessionToken: result.sessionToken, db: prisma, now: baseNow }), null);
  const state = await getPilotSessionStateForSessionToken({ sessionToken: result.sessionToken, db: prisma, now: baseNow });
  assert.equal(state?.kind, 'RESTRICTED_FIRST_LOGIN');
  assert.equal(state?.context.organisationId, fixture.organisation.id);
  const stored = await prisma.authSession.findUniqueOrThrow({ where: { tokenHash: hashSessionToken(result.sessionToken) } });
  assert.equal(stored.sessionType, 'RESTRICTED_FIRST_LOGIN');
});

test('expired temporary credentials fail generically and create no session', async () => {
  const fixture = await createInvitedOwner('expired', {
    credentialExpiresAt: new Date(baseNow.getTime() - 1)
  });
  const result = await authenticatePilotCredentials({
    email: fixture.user.email,
    password: fixture.credential,
    db: prisma,
    now: baseNow
  });
  assert.equal(result, null);
  assert.equal(await prisma.authSession.count({ where: { userId: fixture.user.id } }), 0);
  assert.equal(await prisma.auditLog.count({ where: { userId: fixture.user.id, action: 'CREDENTIAL_EXPIRED' } }), 1);
});

test('incorrect temporary passwords and incomplete invited credential state create no session', async () => {
  const incorrect = await createInvitedOwner('incorrect-password');
  assert.equal(await authenticatePilotCredentials({
    email: incorrect.user.email,
    password: 'incorrect temporary password',
    db: prisma,
    now: baseNow
  }), null);
  assert.equal(await prisma.authSession.count({ where: { userId: incorrect.user.id } }), 0);

  const invalidState = await createInvitedOwner('missing-state');
  await assert.rejects(
    prisma.user.update({
      where: { id: invalidState.user.id },
      data: { temporaryCredentialExpiresAt: null }
    }),
    /constraint/i
  );
  await assert.rejects(
    prisma.user.update({
      where: { id: invalidState.user.id },
      data: { mustChangePassword: false }
    }),
    /constraint/i
  );

  await prisma.user.update({
    where: { id: invalidState.user.id },
    data: { status: 'ACTIVE', mustChangePassword: false, temporaryCredentialExpiresAt: null }
  });
  assert.equal(await authenticatePilotCredentials({
    email: invalidState.user.email,
    password: invalidState.credential,
    db: prisma,
    now: baseNow
  }), null);
  assert.equal(await prisma.authSession.count({ where: { userId: invalidState.user.id } }), 0);
});

test('inactive membership, invalid owner state, and inactive organisation create no restricted session', async () => {
  const membershipFixture = await createInvitedOwner('inactive-membership');
  await prisma.organisationMembership.update({ where: { id: membershipFixture.membership.id }, data: { status: 'INACTIVE' } });
  assert.equal(await authenticatePilotCredentials({ email: membershipFixture.user.email, password: membershipFixture.credential, db: prisma, now: baseNow }), null);

  const ownerFixture = await createInvitedOwner('not-owner');
  await prisma.organisationMembership.update({ where: { id: ownerFixture.membership.id }, data: { isOwner: false, role: 'ORGANISATION_MEMBER' } });
  assert.equal(await authenticatePilotCredentials({ email: ownerFixture.user.email, password: ownerFixture.credential, db: prisma, now: baseNow }), null);

  const organisationFixture = await createInvitedOwner('inactive-organisation');
  await prisma.organisation.update({ where: { id: organisationFixture.organisation.id }, data: { status: 'INACTIVE' } });
  assert.equal(await authenticatePilotCredentials({ email: organisationFixture.user.email, password: organisationFixture.credential, db: prisma, now: baseNow }), null);
});

test('restricted sessions do not refresh and re-login is allowed while the temporary credential remains valid', async () => {
  const fixture = await createInvitedOwner('relogin');
  const first = await restrictedLogin(fixture);
  const afterRestrictedExpiry = new Date(first.expiresAt.getTime() + 1);
  assert.equal(await getPilotSessionStateForSessionToken({ sessionToken: first.sessionToken, db: prisma, now: afterRestrictedExpiry }), null);

  const second = await restrictedLogin(fixture, afterRestrictedExpiry);
  assert.notEqual(second.sessionToken, first.sessionToken);
  assert.equal(second.expiresAt.getTime(), afterRestrictedExpiry.getTime() + RESTRICTED_SESSION_TTL_SECONDS * 1000);
});

test('password policy, confirmation, current credential, and temporary reuse failures leave lifecycle state unchanged', async () => {
  const fixture = await createInvitedOwner('validation');
  const session = await restrictedLogin(fixture);
  const attempts = [
    { currentCredential: fixture.credential, newPassword: 'short', confirmation: 'short', code: 'PASSWORD_TOO_SHORT' },
    { currentCredential: fixture.credential, newPassword: 'Password123456!', confirmation: 'Password123456!', code: 'PASSWORD_TOO_WEAK' },
    { currentCredential: fixture.credential, newPassword: replacementPassword('Mismatch'), confirmation: 'Different!Orbit!47', code: 'PASSWORD_CONFIRMATION_MISMATCH' },
    { currentCredential: 'incorrect temporary value', newPassword: replacementPassword('WrongCurrent'), confirmation: replacementPassword('WrongCurrent'), code: 'CURRENT_CREDENTIAL_INVALID' },
    { currentCredential: fixture.credential, newPassword: fixture.credential, confirmation: fixture.credential, code: 'PASSWORD_REUSES_TEMPORARY_CREDENTIAL' }
  ] as const;

  for (const attempt of attempts) {
    const result = await completePilotFirstLogin({ ...attempt, sessionToken: session.sessionToken, db: prisma, now: baseNow });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, attempt.code);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
  const organisation = await prisma.organisation.findUniqueOrThrow({ where: { id: fixture.organisation.id } });
  assert.equal(user.status, 'INVITED');
  assert.equal(user.mustChangePassword, true);
  assert.ok(user.temporaryCredentialExpiresAt);
  assert.equal(organisation.status, 'PROVISIONING');
  assert.equal(await getPilotSessionStateForSessionToken({ sessionToken: session.sessionToken, db: prisma, now: baseNow }).then((value) => value?.kind), 'RESTRICTED_FIRST_LOGIN');
});

test('successful replacement atomically activates the owner and tenant and rotates every session', async () => {
  const fixture = await createInvitedOwner('success');
  const restricted = await restrictedLogin(fixture);
  const extraToken = 'extra-restricted-session-token';
  await prisma.authSession.create({
    data: {
      userId: fixture.user.id,
      tokenHash: hashSessionToken(extraToken),
      sessionType: 'RESTRICTED_FIRST_LOGIN',
      expiresAt: restricted.expiresAt
    }
  });
  const newPassword = replacementPassword('Success');
  const result = await completePilotFirstLogin({
    sessionToken: restricted.sessionToken,
    currentCredential: fixture.credential,
    newPassword,
    confirmation: newPassword,
    db: prisma,
    now: baseNow
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
  const organisation = await prisma.organisation.findUniqueOrThrow({ where: { id: fixture.organisation.id } });
  const membership = await prisma.organisationMembership.findUniqueOrThrow({ where: { id: fixture.membership.id } });
  assert.equal(user.status, 'ACTIVE');
  assert.equal(user.mustChangePassword, false);
  assert.equal(user.temporaryCredentialExpiresAt, null);
  assert.equal(await verify(user.passwordHash!, newPassword), true);
  assert.equal(await verify(user.passwordHash!, fixture.credential), false);
  assert.equal(organisation.status, 'ACTIVE');
  assert.equal(organisation.verified, false, 'first login does not change the separate verification flag');
  assert.equal(membership.status, 'ACTIVE');
  assert.equal(membership.isOwner, true);
  assert.equal(membership.role, 'ORGANISATION_OWNER');
  assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 1);
  assert.equal(await getPilotSessionStateForSessionToken({ sessionToken: restricted.sessionToken, db: prisma, now: baseNow }), null);
  assert.equal(await getPilotSessionStateForSessionToken({ sessionToken: extraToken, db: prisma, now: baseNow }), null);
  const normal = await getPilotSessionStateForSessionToken({ sessionToken: result.sessionToken, db: prisma, now: baseNow });
  assert.equal(normal?.kind, 'NORMAL');
  assert.equal(normal?.context.organisationId, fixture.organisation.id);
  const actions = await prisma.auditLog.findMany({ where: { userId: user.id }, select: { action: true } });
  for (const action of ['PASSWORD_CHANGED', 'USER_ACTIVATED', 'ORGANISATION_ACTIVATED', 'SESSIONS_INVALIDATED', 'NORMAL_SESSION_CREATED', 'FIRST_LOGIN_COMPLETED']) {
    assert.ok(actions.some((entry) => entry.action === action), `missing ${action} audit event`);
  }
});

test('the old credential is invalid and the replacement password supports normal login', async () => {
  const fixture = await createInvitedOwner('credentials');
  const restricted = await restrictedLogin(fixture);
  const newPassword = replacementPassword('Credentials');
  const activated = await completePilotFirstLogin({
    sessionToken: restricted.sessionToken,
    currentCredential: fixture.credential,
    newPassword,
    confirmation: newPassword,
    db: prisma,
    now: baseNow
  });
  assert.equal(activated.ok, true);
  assert.equal(await authenticatePilotCredentials({ email: fixture.user.email, password: fixture.credential, db: prisma, now: baseNow }), null);
  const normalLogin = await authenticatePilotCredentials({ email: fixture.user.email, password: newPassword, db: prisma, now: baseNow });
  assert.ok(normalLogin);
  assert.equal(normalLogin.sessionKind, 'NORMAL');
});

test('a normal session cannot call the restricted activation boundary', async () => {
  const fixture = await createInvitedOwner('normal-denied');
  const restricted = await restrictedLogin(fixture);
  const newPassword = replacementPassword('NormalDenied');
  const activated = await completePilotFirstLogin({
    sessionToken: restricted.sessionToken,
    currentCredential: fixture.credential,
    newPassword,
    confirmation: newPassword,
    db: prisma,
    now: baseNow
  });
  assert.equal(activated.ok, true);
  if (!activated.ok) return;
  const denied = await completePilotFirstLogin({
    sessionToken: activated.sessionToken,
    currentCredential: newPassword,
    newPassword: replacementPassword('Second'),
    confirmation: replacementPassword('Second'),
    db: prisma,
    now: baseNow
  });
  assert.deepEqual(denied, { ok: false, code: 'RESTRICTED_SESSION_REQUIRED' });
});

test('transaction-critical audit failure rolls back activation state and session rotation', async () => {
  const fixture = await createInvitedOwner('rollback');
  const restricted = await restrictedLogin(fixture);
  const newPassword = replacementPassword('Rollback');

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION "${suffix}_reject_first_login_audit"() RETURNS trigger AS $$
    BEGIN
      IF NEW."action" = 'FIRST_LOGIN_COMPLETED' THEN
        RAISE EXCEPTION 'disposable first-login rollback test';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER "${suffix}_first_login_audit_trigger"
      BEFORE INSERT ON "AuditLog"
      FOR EACH ROW EXECUTE FUNCTION "${suffix}_reject_first_login_audit"()
  `);
  try {
    const result = await completePilotFirstLogin({
      sessionToken: restricted.sessionToken,
      currentCredential: fixture.credential,
      newPassword,
      confirmation: newPassword,
      db: prisma,
      now: baseNow
    });
    assert.deepEqual(result, { ok: false, code: 'ACTIVATION_UNAVAILABLE' });
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${suffix}_first_login_audit_trigger" ON "AuditLog"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${suffix}_reject_first_login_audit"()`);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
  const organisation = await prisma.organisation.findUniqueOrThrow({ where: { id: fixture.organisation.id } });
  assert.equal(user.status, 'INVITED');
  assert.equal(user.mustChangePassword, true);
  assert.equal(await verify(user.passwordHash!, fixture.credential), true);
  assert.equal(organisation.status, 'PROVISIONING');
  assert.equal(await getPilotSessionStateForSessionToken({ sessionToken: restricted.sessionToken, db: prisma, now: baseNow }).then((value) => value?.kind), 'RESTRICTED_FIRST_LOGIN');
});

test('concurrent replacement submissions produce exactly one activation and one normal session', async () => {
  const fixture = await createInvitedOwner('concurrency');
  const restricted = await restrictedLogin(fixture);
  const newPassword = replacementPassword('Concurrency');
  const results = await Promise.all([
    completePilotFirstLogin({ sessionToken: restricted.sessionToken, currentCredential: fixture.credential, newPassword, confirmation: newPassword, db: prisma, now: baseNow }),
    completePilotFirstLogin({ sessionToken: restricted.sessionToken, currentCredential: fixture.credential, newPassword, confirmation: newPassword, db: prisma, now: baseNow })
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(await prisma.authSession.count({ where: { userId: fixture.user.id, sessionType: 'NORMAL' } }), 1);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } })).status, 'ACTIVE');
  assert.equal((await prisma.organisation.findUniqueOrThrow({ where: { id: fixture.organisation.id } })).status, 'ACTIVE');
});

test('restricted contexts remain tenant-scoped and expose no normal tenant access', async () => {
  const first = await createInvitedOwner('tenant-a');
  const second = await createInvitedOwner('tenant-b');
  const firstSession = await restrictedLogin(first);
  const secondSession = await restrictedLogin(second);
  const firstState = await getPilotSessionStateForSessionToken({ sessionToken: firstSession.sessionToken, db: prisma, now: baseNow });
  const secondState = await getPilotSessionStateForSessionToken({ sessionToken: secondSession.sessionToken, db: prisma, now: baseNow });
  assert.equal(firstState?.context.organisationId, first.organisation.id);
  assert.equal(secondState?.context.organisationId, second.organisation.id);
  assert.notEqual(firstState?.context.organisationId, secondState?.context.organisationId);
  assert.equal(await getPilotContextForSessionToken({ sessionToken: firstSession.sessionToken, db: prisma, now: baseNow }), null);
});

test('audit records, persisted records, and safe result fields contain no plaintext credentials or passwords', async () => {
  const fixture = await createInvitedOwner('secret-safety');
  const restricted = await restrictedLogin(fixture);
  const newPassword = replacementPassword('SecretSafety');
  const result = await completePilotFirstLogin({
    sessionToken: restricted.sessionToken,
    currentCredential: fixture.credential,
    newPassword,
    confirmation: newPassword,
    db: prisma,
    now: baseNow
  });
  assert.equal(result.ok, true);

  const audit = await prisma.auditLog.findMany({
    where: { organisationId: fixture.organisation.id },
    select: { action: true, metadataJson: true, outcome: true, source: true }
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
  const persistedSafeView = JSON.stringify({
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    temporaryCredentialExpiresAt: user.temporaryCredentialExpiresAt,
    audit
  });
  for (const secret of [...temporaryCredentials, ...replacementPasswords]) {
    assert.doesNotMatch(persistedSafeView, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(user.passwordHash ?? '', /^\$argon2id\$/);
  assert.ok(audit.length >= 8);
});
