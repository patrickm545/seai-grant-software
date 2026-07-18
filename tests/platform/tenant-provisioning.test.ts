import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  FakeCredentialDeliveryAdapter,
  type CredentialDeliveryAdapter
} from '../../lib/credential-delivery';
import {
  executeTenantProvisioning,
  generateTemporaryCredential,
  hashTenantProvisioningInput,
  planTenantProvisioning,
  TenantProvisioningError,
  validateTenantProvisioningInput,
  type TenantProvisioningInput
} from '../../lib/tenant-provisioning';

const baseInput: TenantProvisioningInput = {
  organisationName: 'Harbour Solar Ltd',
  organisationSlug: 'harbour-solar',
  installerName: 'Harbour Solar',
  installerSlug: 'harbour-solar-installer',
  seaiCompanyId: 'SEAI-HARBOUR-001',
  websiteDomain: 'harbour-solar.example',
  county: 'Galway',
  ownerDisplayName: 'Aoife Byrne',
  ownerEmail: 'aoife@harbour-solar.example',
  approverUserId: 'clada-approver-1',
  idempotencyKey: 'pilot-2026-001',
  environment: 'test'
};

const approver = {
  id: 'clada-approver-1',
  email: 'patrick@clada.example',
  displayName: 'Patrick McKenna',
  status: 'ACTIVE',
  memberships: [
    {
      status: 'ACTIVE',
      role: 'CLADA_INTERNAL_ADMIN',
      organisation: { type: 'CLADA_INTERNAL', status: 'ACTIVE' }
    }
  ]
};

type MockOverrides = {
  approver?: unknown;
  operation?: unknown;
  organisationBySlug?: unknown;
  organisationByName?: unknown;
  installerBySlug?: unknown;
  installerBySeaiId?: unknown;
  owner?: unknown;
  transaction?: PrismaClient['$transaction'];
};

function mockDb(overrides: MockOverrides = {}) {
  return {
    user: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
        where.id ? (Object.hasOwn(overrides, 'approver') ? overrides.approver : approver) : (overrides.owner ?? null)
    },
    provisioningOperation: {
      findUnique: async () => overrides.operation ?? null
    },
    organisation: {
      findUnique: async () => overrides.organisationBySlug ?? null,
      findFirst: async () => overrides.organisationByName ?? null
    },
    installer: {
      findUnique: async () => overrides.installerBySlug ?? null,
      findFirst: async () => overrides.installerBySeaiId ?? null
    },
    $transaction:
      overrides.transaction ??
      (async () => {
        throw new Error('Dry-run must not start a transaction.');
      })
  } as unknown as PrismaClient;
}

test('tenant provisioning input trims text and normalises owner email and domain', () => {
  const parsed = validateTenantProvisioningInput({
    ...baseInput,
    organisationName: '  Harbour Solar Ltd  ',
    ownerEmail: '  AOIFE@HARBOUR-SOLAR.EXAMPLE ',
    websiteDomain: '  HARBOUR-SOLAR.EXAMPLE '
  });
  assert.equal(parsed.organisationName, 'Harbour Solar Ltd');
  assert.equal(parsed.ownerEmail, 'aoife@harbour-solar.example');
  assert.equal(parsed.websiteDomain, 'harbour-solar.example');
});

test('tenant provisioning rejects invalid slugs, unsafe domains, incomplete input, and password fields', () => {
  for (const input of [
    { ...baseInput, organisationSlug: 'Harbour-Solar' },
    { ...baseInput, installerSlug: 'harbour_solar' },
    { ...baseInput, websiteDomain: 'https://harbour-solar.example/login' },
    { ...baseInput, ownerDisplayName: ' ' },
    { ...baseInput, ownerPassword: 'must-not-be-accepted' }
  ]) {
    assert.throws(() => validateTenantProvisioningInput(input), TenantProvisioningError);
  }

  const rejectedSecret = 'must-not-appear-in-an-error';
  try {
    validateTenantProvisioningInput({
      ...baseInput,
      ownerPassword: rejectedSecret
    } as unknown as TenantProvisioningInput);
    assert.fail('Plaintext password input should be rejected.');
  } catch (error) {
    assert.ok(error instanceof TenantProvisioningError);
    assert.ok(!JSON.stringify(error).includes(rejectedSecret));
  }
});

test('canonical input hashing is deterministic after normalisation', () => {
  const first = validateTenantProvisioningInput(baseInput);
  const second = validateTenantProvisioningInput({
    ...baseInput,
    organisationName: ` ${baseInput.organisationName} `,
    ownerEmail: baseInput.ownerEmail.toUpperCase()
  });
  assert.equal(hashTenantProvisioningInput(first), hashTenantProvisioningInput(second));
  assert.notEqual(
    hashTenantProvisioningInput(first),
    hashTenantProvisioningInput(validateTenantProvisioningInput({ ...baseInput, county: 'Mayo' }))
  );
  assert.equal(
    hashTenantProvisioningInput(first),
    hashTenantProvisioningInput(
      validateTenantProvisioningInput({ ...baseInput, idempotencyKey: 'a-different-operation-key' })
    )
  );
});

test('temporary credential generation uses policy-compatible high-entropy values', () => {
  const first = generateTemporaryCredential();
  const second = generateTemporaryCredential();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
});

test('dry-run produces an exact non-secret plan and performs no writes', async () => {
  const plan = await planTenantProvisioning(mockDb(), baseInput);
  assert.equal(plan.safeToExecute, true);
  assert.equal(plan.owner.email, baseInput.ownerEmail);
  assert.equal(plan.approver.id, baseInput.approverUserId);
  assert.equal(plan.idempotency.result, 'NEW');
  assert.ok(plan.intendedDatabaseActions.length > 0);
  assert.doesNotMatch(JSON.stringify(plan), /password|credentialHash|temporaryCredential/i);
});

test('missing, inactive, or non-internal approvers are rejected', async () => {
  for (const invalidApprover of [
    null,
    { ...approver, status: 'INACTIVE' },
    {
      ...approver,
      memberships: [{ status: 'ACTIVE', role: 'ORGANISATION_OWNER', organisation: { type: 'INSTALLER', status: 'ACTIVE' } }]
    }
  ]) {
    await assert.rejects(
      planTenantProvisioning(mockDb({ approver: invalidApprover }), baseInput),
      (error: unknown) => error instanceof TenantProvisioningError && error.code === 'APPROVER_NOT_AUTHORISED'
    );
  }
});

test('idempotency mismatch and incomplete operations stop safely', async () => {
  const canonical = validateTenantProvisioningInput(baseInput);
  const inputHash = hashTenantProvisioningInput(canonical);
  const mismatch = await planTenantProvisioning(
    mockDb({ operation: { id: 'op-1', inputHash: 'different', status: 'COMPLETED' } }),
    baseInput
  );
  assert.equal(mismatch.idempotency.result, 'MISMATCH');
  assert.ok(mismatch.conflicts.some(({ code }) => code === 'IDEMPOTENCY_KEY_MISMATCH'));

  const incomplete = await planTenantProvisioning(
    mockDb({ operation: { id: 'op-2', inputHash, status: 'READY' } }),
    baseInput
  );
  assert.equal(incomplete.idempotency.result, 'INCOMPLETE');
  assert.ok(incomplete.conflicts.some(({ code }) => code === 'IDEMPOTENCY_OPERATION_INCOMPLETE'));
});

test('an exact completed operation produces a write-free idempotent replay plan', async () => {
  const inputHash = hashTenantProvisioningInput(validateTenantProvisioningInput(baseInput));
  const plan = await planTenantProvisioning(
    mockDb({
      approver: { ...approver, status: 'INACTIVE', memberships: [] },
      operation: { id: 'op-completed', inputHash, status: 'COMPLETED', organisationId: 'org-completed' },
      organisationBySlug: {
        id: 'org-completed',
        name: baseInput.organisationName,
        type: 'INSTALLER',
        status: 'PROVISIONING'
      },
      installerBySlug: {
        id: 'installer-completed',
        organisationId: 'org-completed',
        name: baseInput.installerName,
        seaiCompanyId: baseInput.seaiCompanyId,
        websiteDomain: baseInput.websiteDomain,
        county: baseInput.county
      },
      owner: {
        id: 'owner-completed',
        displayName: baseInput.ownerDisplayName,
        status: 'INVITED',
        mustChangePassword: true,
        temporaryCredentialExpiresAt: new Date('2026-07-19T13:00:00.000Z'),
        memberships: [
          {
            organisationId: 'org-completed',
            status: 'ACTIVE',
            role: 'ORGANISATION_OWNER',
            isOwner: true
          }
        ]
      }
    }),
    baseInput
  );
  assert.equal(plan.safeToExecute, true);
  assert.equal(plan.idempotency.result, 'COMPLETED_MATCH');
  assert.deepEqual(plan.intendedDatabaseActions, []);
});

test('organisation, installer, SEAI identity, and owner conflicts are explicit', async () => {
  const plan = await planTenantProvisioning(
    mockDb({
      organisationBySlug: { id: 'org-existing' },
      installerBySlug: { id: 'installer-existing' },
      installerBySeaiId: { id: 'installer-seai-existing' },
      owner: { id: 'user-existing', memberships: [{ organisationId: 'other-org' }] }
    }),
    baseInput
  );
  assert.equal(plan.safeToExecute, false);
  assert.deepEqual(
    plan.conflicts.map(({ code }) => code),
    ['ORGANISATION_SLUG_CONFLICT', 'INSTALLER_SLUG_CONFLICT', 'OWNER_EMAIL_CONFLICT']
  );

  const identityPlan = await planTenantProvisioning(
    mockDb({ organisationByName: { id: 'org-name' }, installerBySeaiId: { id: 'installer-seai' } }),
    baseInput
  );
  assert.deepEqual(
    identityPlan.conflicts.map(({ code }) => code),
    ['ORGANISATION_NAME_CONFLICT', 'SEAI_COMPANY_ID_CONFLICT']
  );
});

test('transaction failure is redacted, rolls back through the database boundary, and never calls delivery', async () => {
  const adapter = new FakeCredentialDeliveryAdapter();
  const transactionDb = mockDb();
  Object.assign(transactionDb.provisioningOperation, {
    create: async () => ({ id: 'op-transaction' }),
    update: async () => ({})
  });
  Object.assign(transactionDb.organisation, {
    create: async () => {
      throw new Error(`database rejected value ${baseInput.ownerEmail}`);
    }
  });
  const db = mockDb({
    transaction: (async (callback: (tx: PrismaClient) => unknown) =>
      callback(transactionDb)) as unknown as PrismaClient['$transaction']
  });

  await assert.rejects(
    executeTenantProvisioning({
      db,
      input: baseInput,
      deliveryAdapter: adapter,
      loginUrl: 'https://example.test/login'
    }),
    (error: unknown) =>
      error instanceof TenantProvisioningError &&
      error.code === 'TRANSACTION_FAILED' &&
      !error.message.includes(baseInput.ownerEmail)
  );
  assert.equal(adapter.safeDeliveryCount, 0);
});

test('fake delivery adapter confirms delivery without retaining or returning plaintext', async () => {
  const adapter: CredentialDeliveryAdapter = new FakeCredentialDeliveryAdapter();
  const receipt = await adapter.deliverTemporaryCredential({
    recipientEmail: baseInput.ownerEmail,
    recipientName: baseInput.ownerDisplayName,
    organisationName: baseInput.organisationName,
    loginUrl: 'https://example.test/login',
    temporaryCredential: 'in-memory-only-test-value',
    expiresAt: new Date('2026-07-19T13:00:00.000Z'),
    operationId: 'operation-1'
  });
  assert.deepEqual(receipt, { providerDeliveryId: 'fake-delivery-1', status: 'DELIVERED' });
  assert.doesNotMatch(JSON.stringify(adapter), /in-memory-only-test-value/);
  assert.doesNotMatch(JSON.stringify(receipt), /in-memory-only-test-value/);
});
