import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { verify } from '@node-rs/argon2';
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
  executeProductionLegacyCredentialReissue,
  inspectTenantRecovery,
  planProductionLegacyCredentialReissue,
  planTenantCredentialReissue,
  TenantRecoveryError,
  type ProductionCredentialReissueAuthorization,
  type ProductionLegacyCredentialReissueInput,
  type RecoveryInput
} from '../../lib/tenant-recovery';
import {
  authenticatePilotCredentials,
  completePilotFirstLogin,
  hashPilotPassword
} from '../../lib/pilot-auth';
import { executeTenantProvisioning, type TenantProvisioningInput } from '../../lib/tenant-provisioning';

const prisma = new PrismaClient();
process.env.AUTH_SESSION_PEPPER = 'tenant-recovery-integration-session-pepper-2026';

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

async function seedLegacyProductionUser(
  label: string,
  overrides: {
    userStatus?: 'ACTIVE' | 'INACTIVE';
    membershipStatus?: 'ACTIVE' | 'INACTIVE';
    organisationStatus?: 'ACTIVE' | 'INACTIVE';
    organisationType?: 'INSTALLER' | 'CLADA_INTERNAL';
    verified?: boolean;
    installer?: boolean;
    mustChangePassword?: boolean;
  } = {}
) {
  const id = suffix(`legacy-${label}`);
  const slugKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const operatorUserId = `legacy-operator-${id}`;
  await seedApprover(operatorUserId);
  const organisation = await prisma.organisation.create({
    data: {
      name: `Legacy Recovery ${id}`,
      slug: `legacy-recovery-${slugKey}`,
      type: overrides.organisationType ?? 'INSTALLER',
      status: overrides.organisationStatus ?? 'ACTIVE',
      verified: overrides.verified ?? true
    }
  });
  const installer = overrides.installer === false
    ? null
    : await prisma.installer.create({
        data: {
          organisationId: organisation.id,
          name: `Legacy Installer ${id}`,
          slug: `legacy-installer-${slugKey}`,
          seaiCompanyId: `LEGACY-${id}`
        }
      });
  const oldPassword = `Old!Legacy!Credential!${id}`;
  const user = await prisma.user.create({
    data: {
      email: `legacy-${id}@example.test`,
      displayName: `Legacy Owner ${id}`,
      passwordHash: await hashPilotPassword(oldPassword),
      status: overrides.userStatus ?? 'ACTIVE',
      mustChangePassword: overrides.mustChangePassword ?? false
    }
  });
  const membership = await prisma.organisationMembership.create({
    data: {
      organisationId: organisation.id,
      userId: user.id,
      status: overrides.membershipStatus ?? 'ACTIVE',
      role: 'ORGANISATION_OWNER',
      isOwner: true
    }
  });
  return { id, operatorUserId, organisation, installer, user, membership, oldPassword };
}

function productionLegacyInput(
  fixture: Awaited<ReturnType<typeof seedLegacyProductionUser>>,
  key = `legacy-recovery-${fixture.id}`
): ProductionLegacyCredentialReissueInput {
  return {
    email: fixture.user.email,
    operatorUserId: fixture.operatorUserId,
    idempotencyKey: key,
    reason: 'Approved Production legacy pilot credential recovery',
    environment: 'production'
  };
}

function productionAuthorization(
  planReference: string,
  overrides: Partial<ProductionCredentialReissueAuthorization> = {}
): ProductionCredentialReissueAuthorization {
  return {
    confirmed: true,
    acknowledgement: 'REISSUE_APPROVED_PRODUCTION_CREDENTIAL',
    changeId: 'INCIDENT-2026-07-23-PRODUCTION-AUTH-503',
    appEnvironment: 'production',
    databaseEnvironment: 'production',
    databaseFingerprint: 'db_production_test_marker',
    productionFingerprint: 'db_production_test_marker',
    approvedPlanReference: planReference,
    ...overrides
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
  const storedOperation = await prisma.provisioningOperation.findUniqueOrThrow({ where: { id: result.operation.id } });
  assert.deepEqual(storedOperation.resultSnapshot, {
    operationType: 'RECOVERY_CREDENTIAL_REISSUE',
    state: 'INVITED_CREDENTIAL_EXPIRED',
    organisationId: tenant.organisation.id,
    userId: tenant.owner.id,
    revokedSessionCount: 2,
    completedAt: now.toISOString(),
    delivery: { providerDeliveryId: result.delivery?.providerDeliveryId, status: 'DELIVERED' }
  });

  const replay = await executeTenantCredentialReissue({ db: prisma, input, deliveryAdapter: adapter, now: new Date(now.getTime() + 1_000), loginUrl: 'https://solargrant.example/login' });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(adapter.safeDeliveryCount, 1);
  assert.equal(replay.revokedSessionCount, result.revokedSessionCount);
  assert.deepEqual(replay.delivery, result.delivery);
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

test('credential reissue revalidates lifecycle state inside the serializable transaction', async () => {
  const tenant = await seedTenant('stale-state');
  const now = new Date('2026-07-20T14:00:00.000Z');
  await prisma.user.update({ where: { id: tenant.owner.id }, data: { temporaryCredentialExpiresAt: new Date(now.getTime() - 1_000) } });
  const input = recoveryInput(tenant, `stale-state-${tenant.owner.id}`);
  let injected = false;
  const raceDb = prisma.$extends({
    query: {
      provisioningOperation: {
        async findUnique({ args, query }) {
          const result = await query(args);
          if (!injected && args.where.idempotencyKey === input.idempotencyKey) {
            injected = true;
            await prisma.user.update({ where: { id: tenant.owner.id }, data: { status: 'ACTIVE', mustChangePassword: false, temporaryCredentialExpiresAt: null } });
          }
          return result;
        }
      }
    }
  });
  await assert.rejects(
    executeTenantCredentialReissue({ db: raceDb as unknown as PrismaClient, input, deliveryAdapter: new FakeCredentialDeliveryAdapter(), now }),
    (error: unknown) => error instanceof TenantRecoveryError && error.code === 'RECOVERY_REFUSED'
  );
  assert.equal(await prisma.provisioningOperation.count({ where: { idempotencyKey: input.idempotencyKey } }), 0);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: tenant.owner.id } })).status, 'ACTIVE');
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

test('Production legacy credential recovery is dry-run first, audited, tenant-stable, and forces password replacement', async () => {
  const fixture = await seedLegacyProductionUser('success');
  const input = productionLegacyInput(fixture);
  const now = new Date('2026-07-24T12:00:00.000Z');
  await prisma.authSession.create({
    data: {
      userId: fixture.user.id,
      tokenHash: `legacy-existing-${fixture.user.id}`,
      sessionType: 'NORMAL',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    }
  });
  const beforeOperations = await prisma.provisioningOperation.count();
  const beforeAudits = await prisma.auditLog.count();
  const plan = await planProductionLegacyCredentialReissue({ db: prisma, input });
  assert.equal(plan.safeToExecute, true);
  assert.equal(plan.eligible, true);
  assert.equal(plan.account.exactlyOneUser, true);
  assert.equal(plan.account.exactlyOneActiveMembership, true);
  assert.equal(plan.account.organisationStatus, 'ACTIVE');
  assert.equal(plan.account.organisationType, 'INSTALLER');
  assert.equal(plan.account.organisationVerified, true);
  assert.equal(plan.account.installerPresent, true);
  assert.ok(plan.account.organisationReference?.startsWith('org_'));
  assert.equal(await prisma.provisioningOperation.count(), beforeOperations);
  assert.equal(await prisma.auditLog.count(), beforeAudits);

  const temporaryPassword = `Temporary!Legacy!${fixture.id}`;
  const result = await executeProductionLegacyCredentialReissue({
    db: prisma,
    input,
    temporaryCredential: temporaryPassword,
    authorization: productionAuthorization(plan.planReference),
    now
  });
  assert.equal(result.operation.status, 'COMPLETED');
  assert.equal(result.revokedSessionCount, 1);

  const recovered = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
  assert.equal(recovered.status, 'ACTIVE');
  assert.equal(recovered.mustChangePassword, true);
  assert.equal(recovered.temporaryCredentialExpiresAt?.getTime(), now.getTime() + 24 * 60 * 60 * 1000);
  assert.equal(await verify(recovered.passwordHash!, fixture.oldPassword), false);
  assert.equal(await verify(recovered.passwordHash!, temporaryPassword), true);
  assert.equal(await prisma.authSession.count({ where: { userId: fixture.user.id } }), 0);

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: fixture.organisation.id }
  });
  assert.equal(organisation.status, 'ACTIVE');
  assert.equal(organisation.verified, true);
  assert.equal(await prisma.installer.count({ where: { organisationId: organisation.id } }), 1);
  assert.equal(
    await prisma.organisationMembership.count({
      where: { userId: fixture.user.id, organisationId: organisation.id }
    }),
    1
  );

  const restricted = await authenticatePilotCredentials({
    email: fixture.user.email,
    password: temporaryPassword,
    db: prisma,
    now
  });
  assert.equal(restricted?.sessionKind, 'RESTRICTED_FIRST_LOGIN');
  const newPassword = `Cobalt!River!Lantern!${Math.random().toString(36).slice(2, 8)}`;
  const completed = await completePilotFirstLogin({
    sessionToken: restricted?.sessionToken,
    currentCredential: temporaryPassword,
    newPassword,
    confirmation: newPassword,
    db: prisma,
    now: new Date(now.getTime() + 1_000)
  });
  assert.equal(completed.ok, true);
  const normal = await authenticatePilotCredentials({
    email: fixture.user.email,
    password: newPassword,
    db: prisma,
    now: new Date(now.getTime() + 2_000)
  });
  assert.equal(normal?.sessionKind, 'NORMAL');
  assert.equal(
    await authenticatePilotCredentials({
      email: fixture.user.email,
      password: temporaryPassword,
      db: prisma,
      now: new Date(now.getTime() + 2_000)
    }),
    null
  );

  const operation = await prisma.provisioningOperation.findUniqueOrThrow({
    where: { idempotencyKey: input.idempotencyKey }
  });
  assert.equal(operation.approvedBy, fixture.operatorUserId);
  const audit = await prisma.auditLog.findMany({
    where: { provisioningOperationId: operation.id }
  });
  assert.ok(audit.some(({ action }) => action === 'PRODUCTION_LEGACY_CREDENTIAL_REISSUE_STARTED'));
  assert.ok(audit.some(({ action }) => action === 'LEGACY_CREDENTIAL_RECOVERY_COMPLETED'));
  const serialisedAudit = JSON.stringify(audit);
  assert.doesNotMatch(serialisedAudit, /passwordHash|temporaryCredential|tokenHash/i);
  assert.ok(!serialisedAudit.includes(temporaryPassword));
  assert.ok(!serialisedAudit.includes(fixture.oldPassword));
});

test('Production legacy credential recovery refuses a missing user and the database prevents duplicate normalized users', async () => {
  const fixture = await seedLegacyProductionUser('identity');
  const missing = await planProductionLegacyCredentialReissue({
    db: prisma,
    input: { ...productionLegacyInput(fixture), email: `missing-${fixture.id}@example.test` }
  });
  assert.equal(missing.safeToExecute, false);
  assert.equal(missing.account.exactlyOneUser, false);

  await assert.rejects(
    prisma.user.create({
      data: {
        email: fixture.user.email.toUpperCase(),
        displayName: 'Duplicate Normalized Identity',
        status: 'ACTIVE',
        passwordHash: await hashPilotPassword(`Duplicate!Password!${fixture.id}`)
      }
    }),
    /User_email_normalised_check|constraint/i
  );
});

test('Production legacy credential recovery fails closed for ineligible tenant lifecycle states', async () => {
  const cases = [
    ['inactive-membership', { membershipStatus: 'INACTIVE' as const }],
    ['inactive-organisation', { organisationStatus: 'INACTIVE' as const }],
    ['unverified-organisation', { verified: false }],
    ['non-installer-organisation', { organisationType: 'CLADA_INTERNAL' as const }],
    ['missing-installer', { installer: false }],
    ['inactive-user', { userStatus: 'INACTIVE' as const }],
    ['already-forced', { mustChangePassword: true }]
  ] as const;
  for (const [label, overrides] of cases) {
    const fixture = await seedLegacyProductionUser(label, overrides);
    const plan = await planProductionLegacyCredentialReissue({
      db: prisma,
      input: productionLegacyInput(fixture)
    });
    assert.equal(plan.safeToExecute, false, label);
    assert.equal(plan.eligible, false, label);
  }
});

test('ordinary recovery evidence cannot unlock the active legacy first-login path', async () => {
  const fixture = await seedLegacyProductionUser('unmarked-recovery', {
    mustChangePassword: true
  });
  const now = new Date('2026-07-24T12:00:00.000Z');
  await prisma.user.update({
    where: { id: fixture.user.id },
    data: { temporaryCredentialExpiresAt: new Date(now.getTime() + 60 * 60 * 1000) }
  });
  await prisma.provisioningOperation.create({
    data: {
      idempotencyKey: `unmarked-${fixture.id}`,
      inputHash: 'unmarked-recovery-input',
      operationType: 'RECOVERY_CREDENTIAL_REISSUE',
      status: 'COMPLETED',
      approvedBy: fixture.operatorUserId,
      approvedAt: now,
      completedAt: now,
      organisationId: fixture.organisation.id,
      resultSnapshot: {
        operationType: 'RECOVERY_CREDENTIAL_REISSUE',
        state: 'INVITED_CREDENTIAL_VALID',
        organisationId: fixture.organisation.id,
        userId: fixture.user.id,
        revokedSessionCount: 0,
        completedAt: now.toISOString()
      }
    }
  });
  assert.equal(
    await authenticatePilotCredentials({
      email: fixture.user.email,
      password: fixture.oldPassword,
      db: prisma,
      now
    }),
    null
  );
});

test('database membership uniqueness prevents an ambiguous second active membership', async () => {
  const fixture = await seedLegacyProductionUser('membership-unique');
  const other = await prisma.organisation.create({
    data: {
      name: `Other ${fixture.id}`,
      slug: `other-${fixture.id}`,
      type: 'INSTALLER',
      status: 'ACTIVE',
      verified: true
    }
  });
  await assert.rejects(
    prisma.organisationMembership.create({
      data: {
        organisationId: other.id,
        userId: fixture.user.id,
        status: 'ACTIVE',
        role: 'ORGANISATION_OWNER',
        isOwner: true
      }
    }),
    /Unique constraint|P2002/i
  );
});

test('Production legacy credential recovery requires operator identity, reason, and exact Production authorization', async () => {
  const fixture = await seedLegacyProductionUser('authorization');
  const input = productionLegacyInput(fixture);
  await assert.rejects(
    planProductionLegacyCredentialReissue({
      db: prisma,
      input: { ...input, operatorUserId: 'missing-production-operator' }
    }),
    (error: unknown) => error instanceof TenantRecoveryError && error.code === 'APPROVER_NOT_AUTHORISED'
  );
  await assert.rejects(
    planProductionLegacyCredentialReissue({ db: prisma, input: { ...input, reason: '' } }),
    (error: unknown) => error instanceof TenantRecoveryError && error.code === 'INPUT_INVALID'
  );
  const plan = await planProductionLegacyCredentialReissue({ db: prisma, input });
  const temporaryCredential = `Temporary!Authorization!${fixture.id}`;
  for (const authorization of [
    productionAuthorization(plan.planReference, { confirmed: false as true }),
    productionAuthorization(plan.planReference, { appEnvironment: 'preview' as 'production' }),
    productionAuthorization(plan.planReference, { databaseEnvironment: 'development' as 'production' }),
    productionAuthorization(plan.planReference, { productionFingerprint: 'db_wrong_target' }),
    productionAuthorization(plan.planReference, { acknowledgement: 'WRONG_ACKNOWLEDGEMENT' }),
    productionAuthorization(plan.planReference, { changeId: '' }),
    productionAuthorization('wrong-plan-reference')
  ]) {
    await assert.rejects(
      executeProductionLegacyCredentialReissue({
        db: prisma,
        input,
        temporaryCredential,
        authorization
      }),
      (error: unknown) =>
        error instanceof TenantRecoveryError &&
        error.code === 'PRODUCTION_AUTHORIZATION_REQUIRED'
    );
  }
  assert.equal(
    await prisma.provisioningOperation.count({ where: { idempotencyKey: input.idempotencyKey } }),
    0
  );
});

test('Production legacy credential recovery is idempotent and rejects equivalent duplicate operations', async () => {
  const fixture = await seedLegacyProductionUser('idempotency');
  const input = productionLegacyInput(fixture);
  const plan = await planProductionLegacyCredentialReissue({ db: prisma, input });
  const temporaryCredential = `Temporary!Idempotency!${fixture.id}`;
  const first = await executeProductionLegacyCredentialReissue({
    db: prisma,
    input,
    temporaryCredential,
    authorization: productionAuthorization(plan.planReference)
  });
  const replay = await executeProductionLegacyCredentialReissue({
    db: prisma,
    input,
    temporaryCredential: '',
    authorization: productionAuthorization(plan.planReference)
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.operation.id, first.operation.id);
  const equivalent = await planProductionLegacyCredentialReissue({
    db: prisma,
    input: { ...input, idempotencyKey: `${input.idempotencyKey}-duplicate` }
  });
  assert.equal(equivalent.safeToExecute, false);
  assert.equal(equivalent.idempotency, 'EQUIVALENT_COMPLETED');
  assert.equal(
    await prisma.provisioningOperation.count({
      where: { inputHash: plan.planReference, operationType: 'RECOVERY_CREDENTIAL_REISSUE' }
    }),
    1
  );
});

test('Production legacy credential recovery rolls back user, sessions, operation, and audit together', async () => {
  const fixture = await seedLegacyProductionUser('rollback');
  const input = productionLegacyInput(fixture);
  const now = new Date('2026-07-24T14:00:00.000Z');
  await prisma.authSession.create({
    data: {
      userId: fixture.user.id,
      tokenHash: `legacy-rollback-${fixture.user.id}`,
      sessionType: 'NORMAL',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    }
  });
  const plan = await planProductionLegacyCredentialReissue({ db: prisma, input });
  const failingDb = prisma.$extends({
    query: {
      auditLog: {
        async create() {
          throw new Error('synthetic transaction-critical audit failure');
        }
      }
    }
  });
  await assert.rejects(
    executeProductionLegacyCredentialReissue({
      db: failingDb as unknown as PrismaClient,
      input,
      temporaryCredential: `Temporary!Rollback!${fixture.id}`,
      authorization: productionAuthorization(plan.planReference),
      now
    }),
    (error: unknown) => error instanceof TenantRecoveryError && error.code === 'TRANSACTION_FAILED'
  );
  const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
  assert.equal(user.mustChangePassword, false);
  assert.equal(await verify(user.passwordHash!, fixture.oldPassword), true);
  assert.equal(await prisma.authSession.count({ where: { userId: fixture.user.id } }), 1);
  assert.equal(
    await prisma.provisioningOperation.count({ where: { idempotencyKey: input.idempotencyKey } }),
    0
  );
});

test('ProvisioningOperation requires an explicit operation type at the database boundary', async () => {
  const id = `omission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await assert.rejects(
    prisma.$executeRawUnsafe(`INSERT INTO "ProvisioningOperation" ("id", "idempotencyKey", "inputHash", "status") VALUES ('${id}', '${id}', 'safe-test-hash', 'PENDING'::"ProvisioningOperationStatus")`),
    /23502|Failing row|not-null|operationType/i
  );
});
