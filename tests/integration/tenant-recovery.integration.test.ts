import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import {
  FailingCredentialDeliveryAdapter,
  FakeCredentialDeliveryAdapter
} from '../../lib/credential-delivery';
import {
  executeTenantOrganisationReactivation,
  executeTenantOrganisationSuspension,
  executeTenantCredentialReissue,
  executeTenantUserReactivation,
  executeTenantUserSuspension,
  inspectTenantRecovery,
  planTenantCredentialReissue,
  TenantRecoveryError,
  type RecoveryInput
} from '../../lib/tenant-recovery';
import { executeTenantProvisioning, type TenantProvisioningInput } from '../../lib/tenant-provisioning';

const prisma = new PrismaClient();

function suffix(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedApprover(id: string) {
  const organisation = await prisma.organisation.create({
    data: { name: `Recovery Internal ${id}`, slug: `recovery-internal-${id}`, type: 'CLADA_INTERNAL', status: 'ACTIVE', verified: true }
  });
  const user = await prisma.user.create({
    data: { id, email: `${id}@clada.example`, displayName: 'Recovery Operator', status: 'ACTIVE' }
  });
  await prisma.organisationMembership.create({
    data: { organisationId: organisation.id, userId: user.id, status: 'ACTIVE', role: 'CLADA_INTERNAL_ADMIN', isOwner: false }
  });
}

async function seedTenant(label: string) {
  const id = suffix(label);
  const approverUserId = `approver-${id}`;
  await seedApprover(approverUserId);
  const input: TenantProvisioningInput = {
    organisationName: `Recovery Tenant ${id}`,
    organisationSlug: `recovery-tenant-${id}`,
    installerName: `Recovery Installer ${id}`,
    installerSlug: `recovery-installer-${id}`,
    seaiCompanyId: `SEAI-RECOVERY-${id}`,
    websiteDomain: `${id}.recovery.example`,
    county: 'Galway',
    ownerDisplayName: `Recovery Owner ${id}`,
    ownerEmail: `owner-${id}@recovery.example`,
    approverUserId,
    idempotencyKey: `provision-${id}`,
    environment: 'test'
  };
  const provisioned = await executeTenantProvisioning({
    db: prisma,
    input,
    deliveryAdapter: new FakeCredentialDeliveryAdapter(),
    loginUrl: 'https://solargrant.example/login'
  });
  return { input, approverUserId, ...provisioned };
}

function recoveryInput(tenant: Awaited<ReturnType<typeof seedTenant>>, key: string, reason = 'Approved recovery test') : RecoveryInput {
  return {
    organisationId: tenant.organisation.id,
    installerId: tenant.installer.id,
    ownerUserId: tenant.owner.id,
    approverUserId: tenant.approverUserId,
    idempotencyKey: key,
    reason,
    environment: 'test'
  };
}

test('recovery inspection is classified and secret-free', async () => {
  const tenant = await seedTenant('inspect');
  const result = await inspectTenantRecovery({ db: prisma, organisationId: tenant.organisation.id });
  assert.equal(result.safe, true);
  assert.equal(result.state, 'INVITED_CREDENTIAL_VALID');
  assert.equal(result.organisation.id, tenant.organisation.id);
  assert.ok(result.owner?.email.endsWith('@recovery.example'));
  assert.doesNotMatch(JSON.stringify(result), /argon2|passwordHash|tokenHash|temporaryCredential/i);
  assert.ok(await prisma.auditLog.findFirst({ where: { organisationId: tenant.organisation.id, action: 'RECOVERY_INSPECTION_PERFORMED' } }));
});

test('credential reissue is dry-run first, expires in 24 hours, invalidates sessions, and replays safely', async () => {
  const tenant = await seedTenant('reissue');
  const now = new Date('2026-07-20T12:00:00.000Z');
  await prisma.user.update({ where: { id: tenant.owner.id }, data: { temporaryCredentialExpiresAt: new Date(now.getTime() - 1_000) } });
  await prisma.authSession.createMany({ data: [
    { userId: tenant.owner.id, tokenHash: `reissue-normal-${tenant.owner.id}`, sessionType: 'NORMAL', expiresAt: new Date(now.getTime() + 3_600_000) },
    { userId: tenant.owner.id, tokenHash: `reissue-restricted-${tenant.owner.id}`, sessionType: 'RESTRICTED_FIRST_LOGIN', expiresAt: new Date(now.getTime() + 3_600_000) }
  ] });
  const input = recoveryInput(tenant, `reissue-${tenant.owner.id}`);
  const beforeOperations = await prisma.provisioningOperation.count({ where: { idempotencyKey: input.idempotencyKey } });
  const plan = await planTenantCredentialReissue({ db: prisma, input, now });
  assert.equal(plan.safeToExecute, true);
  assert.equal(await prisma.provisioningOperation.count({ where: { idempotencyKey: input.idempotencyKey } }), beforeOperations);

  const adapter = new FakeCredentialDeliveryAdapter();
  const result = await executeTenantCredentialReissue({ db: prisma, input, deliveryAdapter: adapter, now, loginUrl: 'https://solargrant.example/login' });
  assert.equal(result.operation.status, 'COMPLETED');
  assert.equal(adapter.safeDeliveryCount, 1);
  assert.equal(await prisma.authSession.count({ where: { userId: tenant.owner.id } }), 0);
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: tenant.owner.id } });
  assert.ok(owner.passwordHash?.startsWith('$argon2'));
  assert.equal(owner.temporaryCredentialExpiresAt?.getTime(), now.getTime() + 24 * 60 * 60 * 1000);
  assert.equal(owner.status, 'INVITED');
  assert.equal(owner.mustChangePassword, true);
  assert.equal((await prisma.organisation.findUniqueOrThrow({ where: { id: tenant.organisation.id } })).status, 'PROVISIONING');

  const replay = await executeTenantCredentialReissue({ db: prisma, input, deliveryAdapter: adapter, now: new Date(now.getTime() + 1_000), loginUrl: 'https://solargrant.example/login' });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(adapter.safeDeliveryCount, 1);
  await assert.rejects(
    executeTenantCredentialReissue({ db: prisma, input: { ...input, reason: 'Different approved reason' }, deliveryAdapter: adapter, now }),
    (error: unknown) => error instanceof TenantRecoveryError && error.code === 'IDEMPOTENCY_KEY_MISMATCH'
  );
});

test('delivery failure revokes the replacement credential and keeps onboarding in provisioning', async () => {
  const tenant = await seedTenant('reissue-failure');
  const now = new Date('2026-07-20T13:00:00.000Z');
  await prisma.user.update({ where: { id: tenant.owner.id }, data: { temporaryCredentialExpiresAt: new Date(now.getTime() - 1_000) } });
  const input = recoveryInput(tenant, `reissue-failure-${tenant.owner.id}`);
  await assert.rejects(
    executeTenantCredentialReissue({ db: prisma, input, deliveryAdapter: new FailingCredentialDeliveryAdapter(), now }),
    (error: unknown) => error instanceof TenantRecoveryError && error.code === 'DELIVERY_FAILED'
  );
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: tenant.owner.id } });
  const operation = await prisma.provisioningOperation.findUniqueOrThrow({ where: { idempotencyKey: input.idempotencyKey } });
  assert.equal(operation.status, 'FAILED');
  assert.equal(owner.status, 'INVITED');
  assert.equal(owner.mustChangePassword, true);
  assert.ok(owner.passwordHash?.startsWith('$argon2'));
  assert.ok(owner.temporaryCredentialExpiresAt && owner.temporaryCredentialExpiresAt.getTime() <= now.getTime());
  assert.equal((await prisma.organisation.findUniqueOrThrow({ where: { id: tenant.organisation.id } })).status, 'PROVISIONING');
  const audit = await prisma.auditLog.findMany({ where: { provisioningOperationId: operation.id } });
  assert.ok(audit.some(({ action }) => action === 'CREDENTIAL_REISSUE_FAILED'));
  assert.doesNotMatch(JSON.stringify(audit), /passwordHash|temporaryCredential|tokenHash/i);
});

test('user and organisation suspension/re-activation revoke sessions without deleting tenant data', async () => {
  const userTenant = await seedTenant('suspend-user');
  await prisma.organisation.update({ where: { id: userTenant.organisation.id }, data: { status: 'ACTIVE' } });
  await prisma.user.update({ where: { id: userTenant.owner.id }, data: { status: 'ACTIVE', mustChangePassword: false, temporaryCredentialExpiresAt: null } });
  await prisma.authSession.create({ data: { userId: userTenant.owner.id, tokenHash: `suspend-user-${userTenant.owner.id}`, sessionType: 'NORMAL', expiresAt: new Date(Date.now() + 3_600_000) } });
  const suspendUserInput = recoveryInput(userTenant, `suspend-user-${userTenant.owner.id}`);
  const suspendedUser = await executeTenantUserSuspension({ db: prisma, input: suspendUserInput });
  assert.equal(suspendedUser.operation.status, 'COMPLETED');
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userTenant.owner.id } })).status, 'INACTIVE');
  assert.equal(await prisma.authSession.count({ where: { userId: userTenant.owner.id } }), 0);
  await executeTenantUserReactivation({ db: prisma, input: recoveryInput(userTenant, `reactivate-user-${userTenant.owner.id}`) });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userTenant.owner.id } })).status, 'ACTIVE');

  const organisationTenant = await seedTenant('suspend-organisation');
  await prisma.organisation.update({ where: { id: organisationTenant.organisation.id }, data: { status: 'ACTIVE' } });
  await prisma.user.update({ where: { id: organisationTenant.owner.id }, data: { status: 'ACTIVE', mustChangePassword: false, temporaryCredentialExpiresAt: null } });
  await prisma.authSession.create({ data: { userId: organisationTenant.owner.id, tokenHash: `suspend-org-${organisationTenant.owner.id}`, sessionType: 'NORMAL', expiresAt: new Date(Date.now() + 3_600_000) } });
  const suspendOrganisationInput = recoveryInput(organisationTenant, `suspend-org-${organisationTenant.organisation.id}`);
  await executeTenantOrganisationSuspension({ db: prisma, input: suspendOrganisationInput });
  assert.equal((await prisma.organisation.findUniqueOrThrow({ where: { id: organisationTenant.organisation.id } })).status, 'INACTIVE');
  assert.equal(await prisma.authSession.count({ where: { userId: organisationTenant.owner.id } }), 0);
  await executeTenantOrganisationReactivation({ db: prisma, input: recoveryInput(organisationTenant, `reactivate-org-${organisationTenant.organisation.id}`) });
  assert.equal((await prisma.organisation.findUniqueOrThrow({ where: { id: organisationTenant.organisation.id } })).status, 'ACTIVE');
  assert.equal(await prisma.installer.count({ where: { organisationId: organisationTenant.organisation.id } }), 1);
});
