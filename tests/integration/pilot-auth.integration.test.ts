import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, test } from 'node:test';
import { verify } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import {
  authenticatePilotCredentials,
  getPilotContextForSessionToken,
  hashPilotPassword,
  hashSessionToken,
  invalidatePilotSession
} from '../../lib/pilot-auth';
import { provisionPilotOrganisation } from '../../lib/pilot-provisioning';

process.env.AUTH_SESSION_PEPPER = 'integration-test-session-pepper-value-2026';

const prisma = new PrismaClient();
const suffix = `pilot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `Test-${randomBytes(24).toString('base64url')}`;
const fixtureIds: string[] = [];

async function createPilot(label: string) {
  const organisation = await prisma.organisation.create({
    data: {
      name: `Pilot ${label}`,
      slug: `${suffix}-${label}`,
      type: 'INSTALLER',
      status: 'ACTIVE',
      verified: true
    }
  });
  const user = await prisma.user.create({
    data: {
      email: `${suffix}-${label}@example.test`,
      displayName: `Pilot ${label}`,
      passwordHash: await hashPilotPassword(password),
      status: 'ACTIVE'
    }
  });
  await prisma.organisationMembership.create({
    data: {
      organisationId: organisation.id,
      userId: user.id,
      status: 'ACTIVE',
      isOwner: true,
      role: 'ORGANISATION_OWNER'
    }
  });
  fixtureIds.push(organisation.id);
  return { organisation, user };
}

before(async () => {
  await prisma.$connect();
});

after(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: suffix } },
    select: { id: true }
  });
  const userIds = users.map(({ id }) => id);
  await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.organisationMembership.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.installer.deleteMany({ where: { organisationId: { in: fixtureIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organisation.deleteMany({ where: { id: { in: fixtureIds } } });
  await prisma.$disconnect();
});

test('active user in a verified active installer organisation can authenticate and persist a session', async () => {
  const { organisation, user } = await createPilot('valid');
  const result = await authenticatePilotCredentials({
    email: user.email.toUpperCase(),
    password,
    db: prisma
  });
  assert.ok(result);
  assert.equal(result.context.organisationId, organisation.id);
  assert.equal(result.context.pilotRole, 'OWNER');
  assert.equal((await getPilotContextForSessionToken({ sessionToken: result.sessionToken, db: prisma }))?.userId, user.id);
  assert.ok((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).lastLoginAt);
});

test('invalid passwords and unknown emails are rejected identically', async () => {
  const { user } = await createPilot('invalid');
  assert.equal(await authenticatePilotCredentials({ email: user.email, password: 'wrong password here', db: prisma }), null);
  assert.equal(await authenticatePilotCredentials({ email: `${suffix}-unknown@example.test`, password, db: prisma }), null);
});

test('inactive users and unverified or inactive organisations are rejected', async () => {
  const { organisation, user } = await createPilot('states');
  await prisma.user.update({ where: { id: user.id }, data: { status: 'INACTIVE' } });
  assert.equal(await authenticatePilotCredentials({ email: user.email, password, db: prisma }), null);

  await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
  await prisma.organisation.update({ where: { id: organisation.id }, data: { verified: false } });
  assert.equal(await authenticatePilotCredentials({ email: user.email, password, db: prisma }), null);

  await prisma.organisation.update({ where: { id: organisation.id }, data: { verified: true, status: 'INACTIVE' } });
  assert.equal(await authenticatePilotCredentials({ email: user.email, password, db: prisma }), null);
});

test('logout invalidates the database session and expired sessions fail closed', async () => {
  const { user } = await createPilot('logout');
  const result = await authenticatePilotCredentials({ email: user.email, password, db: prisma });
  assert.ok(result);
  await invalidatePilotSession({ sessionToken: result.sessionToken, db: prisma });
  assert.equal(await getPilotContextForSessionToken({ sessionToken: result.sessionToken, db: prisma }), null);

  const expiredToken = 'expired-test-token';
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(expiredToken),
      expiresAt: new Date('2020-01-01T00:00:00.000Z')
    }
  });
  assert.equal(await getPilotContextForSessionToken({ sessionToken: expiredToken, db: prisma }), null);
  assert.equal(await getPilotContextForSessionToken({ sessionToken: 'invalid-token', db: prisma }), null);
});

test('tenant context comes only from the authenticated membership and missing membership fails closed', async () => {
  const { organisation, user } = await createPilot('tenant');
  const result = await authenticatePilotCredentials({ email: user.email, password, db: prisma });
  assert.ok(result);
  const browserSuppliedOrganisationId = 'org-attacker-controlled';
  const context = await getPilotContextForSessionToken({ sessionToken: result.sessionToken, db: prisma });
  assert.equal(context?.organisationId, organisation.id);
  assert.notEqual(context?.organisationId, browserSuppliedOrganisationId);

  const noMembershipUser = await prisma.user.create({
    data: {
      email: `${suffix}-orphan@example.test`,
      displayName: 'Orphan User',
      status: 'ACTIVE'
    }
  });
  const orphanToken = 'orphan-session-token';
  await prisma.authSession.create({
    data: {
      userId: noMembershipUser.id,
      tokenHash: hashSessionToken(orphanToken),
      expiresAt: new Date(Date.now() + 60_000)
    }
  });
  assert.equal(await getPilotContextForSessionToken({ sessionToken: orphanToken, db: prisma }), null);
});

test('pilot provisioning is idempotent and stores a password hash', async () => {
  const input = {
    organisationName: 'Provisioning Test Solar',
    organisationSlug: `${suffix}-provisioned`,
    ownerName: 'Provisioned Owner',
    ownerEmail: `${suffix}-provisioned@example.test`,
    ownerPassword: password,
    seaiCompanyId: `SEAI-${suffix}`
  };
  const first = await provisionPilotOrganisation(prisma, input);
  const second = await provisionPilotOrganisation(prisma, input);
  fixtureIds.push(first.organisation.id);

  assert.equal(first.organisation.id, second.organisation.id);
  assert.equal(first.user.id, second.user.id);
  assert.equal(await prisma.organisationMembership.count({ where: { userId: first.user.id } }), 1);
  const stored = await prisma.user.findUniqueOrThrow({ where: { id: first.user.id } });
  assert.notEqual(stored.passwordHash, password);
  assert.ok(stored.passwordHash);
  assert.equal(await verify(stored.passwordHash, password), true);
});
