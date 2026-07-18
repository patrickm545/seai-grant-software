import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import {
  FailingCredentialDeliveryAdapter,
  FakeCredentialDeliveryAdapter
} from '../../lib/credential-delivery';
import {
  executeTenantProvisioning,
  planTenantProvisioning,
  TenantProvisioningError,
  type TenantProvisioningInput
} from '../../lib/tenant-provisioning';

const prisma = new PrismaClient();

function uniqueInput(suffix: string): TenantProvisioningInput {
  return {
    organisationName: `Provisioning Test ${suffix}`,
    organisationSlug: `provisioning-test-${suffix}`,
    installerName: `Provisioning Installer ${suffix}`,
    installerSlug: `provisioning-installer-${suffix}`,
    seaiCompanyId: `SEAI-PROVISIONING-${suffix}`,
    websiteDomain: `${suffix}.provisioning.example`,
    county: 'Galway',
    ownerDisplayName: `Owner ${suffix}`,
    ownerEmail: `owner-${suffix}@provisioning.example`,
    approverUserId: `approver-${suffix}`,
    idempotencyKey: `provisioning-operation-${suffix}`,
    environment: 'test'
  };
}

async function seedApprover(input: TenantProvisioningInput) {
  const organisation = await prisma.organisation.create({
    data: {
      name: `Clada Internal ${input.approverUserId}`,
      slug: `clada-internal-${input.approverUserId}`,
      type: 'CLADA_INTERNAL',
      status: 'ACTIVE',
      verified: true
    }
  });
  const user = await prisma.user.create({
    data: {
      id: input.approverUserId,
      email: `${input.approverUserId}@clada.example`,
      displayName: 'Approved Clada Operator',
      status: 'ACTIVE'
    }
  });
  await prisma.organisationMembership.create({
    data: {
      organisationId: organisation.id,
      userId: user.id,
      status: 'ACTIVE',
      role: 'CLADA_INTERNAL_ADMIN',
      isOwner: false
    }
  });
}

test('tenant provisioning commits the approved lifecycle and safely replays idempotently', async () => {
  const suffix = `success-${Date.now()}`;
  const input = uniqueInput(suffix);
  await seedApprover(input);
  const adapter = new FakeCredentialDeliveryAdapter();
  const credentialCreatedAt = new Date('2026-07-18T13:00:00.000Z');

  const result = await executeTenantProvisioning({
    db: prisma,
    input,
    deliveryAdapter: adapter,
    now: credentialCreatedAt,
    loginUrl: 'https://solargrant.example/login'
  });
  assert.equal(result.operation.status, 'COMPLETED');
  assert.equal(result.organisation.status, 'PROVISIONING');
  assert.equal(result.owner.status, 'INVITED');
  assert.equal(result.owner.mustChangePassword, true);
  assert.equal(
    result.owner.temporaryCredentialExpiresAt.getTime() - credentialCreatedAt.getTime(),
    24 * 60 * 60 * 1000
  );
  assert.equal(result.membership.role, 'ORGANISATION_OWNER');
  assert.equal(result.membership.isOwner, true);
  assert.equal(result.membership.status, 'ACTIVE');
  assert.equal(adapter.safeDeliveryCount, 1);

  const storedUser = await prisma.user.findUniqueOrThrow({ where: { id: result.owner.id } });
  assert.ok(storedUser.passwordHash?.startsWith('$argon2'));
  const memberships = await prisma.organisationMembership.count({ where: { userId: storedUser.id } });
  assert.equal(memberships, 1);
  const audits = await prisma.auditLog.findMany({ where: { provisioningOperationId: result.operation.id } });
  assert.ok(audits.some(({ action }) => action === 'TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED'));
  assert.ok(audits.some(({ action }) => action === 'PROVISIONING_COMPLETED'));
  const auditSerialisation = JSON.stringify(audits);
  assert.doesNotMatch(auditSerialisation, /passwordHash|temporaryCredential|plaintext|token/i);
  assert.ok(!auditSerialisation.includes(storedUser.passwordHash!));

  const replay = await executeTenantProvisioning({
    db: prisma,
    input,
    deliveryAdapter: adapter,
    now: new Date('2026-07-18T14:00:00.000Z'),
    loginUrl: 'https://solargrant.example/login'
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.operation.id, result.operation.id);
  assert.equal(adapter.safeDeliveryCount, 1);
  assert.equal(await prisma.organisation.count({ where: { slug: input.organisationSlug } }), 1);
  assert.equal(await prisma.installer.count({ where: { slug: input.installerSlug } }), 1);
  assert.equal(await prisma.user.count({ where: { email: input.ownerEmail } }), 1);
});

test('transaction-critical audit failure rolls back every provisioning row', async () => {
  const suffix = `rollback-${Date.now()}`;
  const input = uniqueInput(suffix);
  await seedApprover(input);
  const faultDb = new PrismaClient();
  faultDb.$use(async (params, next) => {
    if (params.model === 'AuditLog' && params.action === 'create') throw new Error('injected audit failure');
    return next(params);
  });
  const adapter = new FakeCredentialDeliveryAdapter();
  try {
    await assert.rejects(
      executeTenantProvisioning({
        db: faultDb,
        input,
        deliveryAdapter: adapter,
        loginUrl: 'https://solargrant.example/login'
      }),
      (error: unknown) => error instanceof TenantProvisioningError && error.code === 'TRANSACTION_FAILED'
    );
  } finally {
    await faultDb.$disconnect();
  }
  assert.equal(adapter.safeDeliveryCount, 0);
  assert.equal(await prisma.organisation.count({ where: { slug: input.organisationSlug } }), 0);
  assert.equal(await prisma.installer.count({ where: { slug: input.installerSlug } }), 0);
  assert.equal(await prisma.user.count({ where: { email: input.ownerEmail } }), 0);
  assert.equal(await prisma.provisioningOperation.count({ where: { idempotencyKey: input.idempotencyKey } }), 0);
});

test('delivery failure revokes the credential and records safe failed state', async () => {
  const suffix = `delivery-failure-${Date.now()}`;
  const input = uniqueInput(suffix);
  await seedApprover(input);
  await assert.rejects(
    executeTenantProvisioning({
      db: prisma,
      input,
      deliveryAdapter: new FailingCredentialDeliveryAdapter(),
      loginUrl: 'https://solargrant.example/login'
    }),
    (error: unknown) =>
      error instanceof TenantProvisioningError &&
      error.code === 'DELIVERY_FAILED' &&
      !error.message.includes(input.ownerEmail)
  );
  const operation = await prisma.provisioningOperation.findUniqueOrThrow({
    where: { idempotencyKey: input.idempotencyKey }
  });
  assert.equal(operation.status, 'FAILED');
  assert.equal(operation.completedAt, null);
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: input.ownerEmail } });
  assert.equal(owner.status, 'INVITED');
  assert.ok(owner.passwordHash?.startsWith('$argon2'));
  assert.equal(owner.mustChangePassword, true);
  assert.ok(owner.temporaryCredentialExpiresAt);
  assert.ok(owner.temporaryCredentialExpiresAt <= new Date());
  const organisation = await prisma.organisation.findUniqueOrThrow({ where: { slug: input.organisationSlug } });
  assert.equal(organisation.status, 'PROVISIONING');
  const audit = await prisma.auditLog.findFirstOrThrow({
    where: { provisioningOperationId: operation.id, action: 'TEMPORARY_CREDENTIAL_DELIVERY_FAILED' }
  });
  assert.deepEqual(audit.metadataJson, { reasonCode: 'DELIVERY_FAILED', accessRevoked: true });
});

test('idempotency mismatch is rejected without changing the completed tenant', async () => {
  const suffix = `idempotency-mismatch-${Date.now()}`;
  const input = uniqueInput(suffix);
  await seedApprover(input);
  const original = await executeTenantProvisioning({
    db: prisma,
    input,
    deliveryAdapter: new FakeCredentialDeliveryAdapter(),
    loginUrl: 'https://solargrant.example/login'
  });

  await assert.rejects(
    executeTenantProvisioning({
      db: prisma,
      input: { ...input, county: 'Mayo' },
      deliveryAdapter: new FakeCredentialDeliveryAdapter(),
      loginUrl: 'https://solargrant.example/login'
    }),
    (error: unknown) =>
      error instanceof TenantProvisioningError &&
      error.code === 'PROVISIONING_CONFLICT' &&
      error.details?.conflicts?.some(({ code }) => code === 'IDEMPOTENCY_KEY_MISMATCH') === true
  );
  assert.equal(await prisma.provisioningOperation.count({ where: { idempotencyKey: input.idempotencyKey } }), 1);
  assert.equal(await prisma.organisation.count({ where: { id: original.organisation.id } }), 1);
  assert.equal(await prisma.installer.count({ where: { id: original.installer.id } }), 1);
  assert.equal(await prisma.user.count({ where: { id: original.owner.id } }), 1);
});

test('database-backed organisation, installer, SEAI identity, and owner conflicts are explicit', async () => {
  const suffix = `conflicts-${Date.now()}`;
  const existingInput = uniqueInput(`${suffix}-existing`);
  await seedApprover(existingInput);
  await executeTenantProvisioning({
    db: prisma,
    input: existingInput,
    deliveryAdapter: new FakeCredentialDeliveryAdapter(),
    loginUrl: 'https://solargrant.example/login'
  });

  const candidates: Array<{ input: TenantProvisioningInput; expectedCode: string }> = [
    {
      input: {
        ...uniqueInput(`${suffix}-organisation`),
        approverUserId: existingInput.approverUserId,
        organisationSlug: existingInput.organisationSlug
      },
      expectedCode: 'ORGANISATION_SLUG_CONFLICT'
    },
    {
      input: {
        ...uniqueInput(`${suffix}-installer`),
        approverUserId: existingInput.approverUserId,
        installerSlug: existingInput.installerSlug
      },
      expectedCode: 'INSTALLER_SLUG_CONFLICT'
    },
    {
      input: {
        ...uniqueInput(`${suffix}-seai`),
        approverUserId: existingInput.approverUserId,
        seaiCompanyId: existingInput.seaiCompanyId
      },
      expectedCode: 'SEAI_COMPANY_ID_CONFLICT'
    },
    {
      input: {
        ...uniqueInput(`${suffix}-owner`),
        approverUserId: existingInput.approverUserId,
        ownerEmail: existingInput.ownerEmail
      },
      expectedCode: 'OWNER_EMAIL_CONFLICT'
    }
  ];

  for (const candidate of candidates) {
    const plan = await planTenantProvisioning(prisma, candidate.input);
    assert.equal(plan.safeToExecute, false);
    assert.ok(plan.conflicts.some(({ code }) => code === candidate.expectedCode));
  }
});

test('missing, inactive, and unauthorised approvers fail against persisted identities', async () => {
  const suffix = `approver-${Date.now()}`;
  const missingInput = uniqueInput(`${suffix}-missing`);
  await assert.rejects(
    planTenantProvisioning(prisma, missingInput),
    (error: unknown) => error instanceof TenantProvisioningError && error.code === 'APPROVER_NOT_AUTHORISED'
  );

  const inactiveInput = uniqueInput(`${suffix}-inactive`);
  await prisma.user.create({
    data: {
      id: inactiveInput.approverUserId,
      email: `${inactiveInput.approverUserId}@clada.example`,
      displayName: 'Inactive Approver',
      status: 'INACTIVE'
    }
  });
  await assert.rejects(
    planTenantProvisioning(prisma, inactiveInput),
    (error: unknown) => error instanceof TenantProvisioningError && error.code === 'APPROVER_NOT_AUTHORISED'
  );

  const unauthorisedInput = uniqueInput(`${suffix}-unauthorised`);
  const customerOrganisation = await prisma.organisation.create({
    data: {
      name: `Unauthorised Customer ${suffix}`,
      slug: `unauthorised-customer-${suffix}`,
      type: 'INSTALLER',
      status: 'ACTIVE',
      verified: true
    }
  });
  await prisma.user.create({
    data: {
      id: unauthorisedInput.approverUserId,
      email: `${unauthorisedInput.approverUserId}@customer.example`,
      displayName: 'Customer Owner',
      status: 'ACTIVE',
      memberships: {
        create: {
          organisationId: customerOrganisation.id,
          status: 'ACTIVE',
          role: 'ORGANISATION_OWNER',
          isOwner: true
        }
      }
    }
  });
  await assert.rejects(
    planTenantProvisioning(prisma, unauthorisedInput),
    (error: unknown) => error instanceof TenantProvisioningError && error.code === 'APPROVER_NOT_AUTHORISED'
  );
});

test.after(async () => {
  await prisma.$disconnect();
});
