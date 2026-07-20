import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { join, relative } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  assertDatabaseOperationAllowed,
  assertDisposableTestDatabase
} from '../lib/database-safety';
import {
  assertAuditEventChain,
  assertRehearsalSecretFree,
  buildRehearsalMarkdown
} from '../lib/pilot-rehearsal';
import {
  cleanupSyntheticData,
  SyntheticCleanupError,
  type SyntheticCleanupSummary,
  type SyntheticCleanupTrackedIds
} from '../lib/pilot-rehearsal-cleanup';
import {
  FailingCredentialDeliveryAdapter,
  FakeCredentialDeliveryAdapter,
  type CredentialDeliveryAdapter
} from '../lib/credential-delivery';
import {
  authenticatePilotCredentials,
  completePilotFirstLogin,
  getPilotContextForSessionToken,
  getPilotSessionStateForSessionToken,
  invalidatePilotSession
} from '../lib/pilot-auth';
import {
  executeTenantProvisioning,
  planTenantProvisioning,
  TenantProvisioningError,
  type TenantProvisioningInput,
  type TenantProvisioningResult
} from '../lib/tenant-provisioning';
import {
  executeTenantCredentialReissue,
  executeTenantOrganisationReactivation,
  executeTenantOrganisationSuspension,
  executeTenantUserReactivation,
  executeTenantUserSuspension,
  inspectTenantRecovery,
  planTenantUserSuspension,
  TenantRecoveryError,
  type RecoveryInput
} from '../lib/tenant-recovery';
import {
  OrganisationRecordAccessError,
  leadOrganisationWhere,
  updateLeadInOrganisation
} from '../lib/lead-access';
import { resolveOrganisationContextForUser, OrganisationContextError } from '../lib/identity';

const HELP = `Usage: pnpm pilot:rehearsal [--dry-run | --execute]

Runs a synthetic installer onboarding, first-login, isolation, suspension,
recovery, reissue, rollback, audit and cleanup rehearsal against a disposable
local PostgreSQL database.

Options:
  --dry-run       Validate database safety and print the planned stages (default)
  --execute       Run the complete disposable rehearsal and write an ignored report
  --help          Show this help without loading a database

Required execution environment:
  APP_ENV=test DATABASE_ENVIRONMENT=test DATABASE_URL=<local disposable PostgreSQL>
  DATABASE_FINGERPRINT=<matching fingerprint>
  PRODUCTION_DATABASE_FINGERPRINT=<known production fingerprint>
  PREVIEW_DATABASE_FINGERPRINT=<known preview fingerprint>
  DEVELOPMENT_DATABASE_FINGERPRINT=<known development fingerprint>
  AUTH_SESSION_PEPPER=<test-only pepper with at least 32 characters>
  DATABASE_BRANCH_ID=<disposable branch label>`;

type Options = { mode: 'dry-run' | 'execute'; help: boolean };

type Stage = {
  name: string;
  status: 'PASSED' | 'FAILED';
  details?: Record<string, string | number | boolean>;
};

type Tenant = {
  label: string;
  input: TenantProvisioningInput;
  result: TenantProvisioningResult;
  delivery: RehearsalDeliveryAdapter;
  credential: string;
  password?: string;
  restrictedSessionToken?: string;
  normalSessionToken?: string;
};

class RehearsalDeliveryAdapter implements CredentialDeliveryAdapter {
  readonly name = 'fake-rehearsal';
  private readonly fake = new FakeCredentialDeliveryAdapter();
  private pendingCredential: string | undefined;

  async deliverTemporaryCredential(delivery: Parameters<CredentialDeliveryAdapter['deliverTemporaryCredential']>[0]) {
    this.pendingCredential = delivery.temporaryCredential;
    return this.fake.deliverTemporaryCredential(delivery);
  }

  takeCredential() {
    const credential = this.pendingCredential;
    this.pendingCredential = undefined;
    return credential;
  }

  get safeDeliveryCount() {
    return this.fake.safeDeliveryCount;
  }
}

function parseArguments(argv: string[]): Options {
  let mode: Options['mode'] = 'dry-run';
  let selected = false;
  let help = false;
  for (const argument of argv) {
    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }
    if (argument === '--dry-run') {
      if (selected && mode !== 'dry-run') throw new Error('--dry-run and --execute cannot be combined.');
      mode = 'dry-run';
      selected = true;
      continue;
    }
    if (argument === '--execute') {
      if (selected && mode !== 'execute') throw new Error('--dry-run and --execute cannot be combined.');
      mode = 'execute';
      selected = true;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return { mode, help };
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rehearsalId() {
  return `pilot-rehearsal-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function marker(id: string) {
  return id.replace(/[^a-z0-9-]/gi, '').toLowerCase();
}

function syntheticInput(label: string, id: string, approverUserId: string): TenantProvisioningInput {
  const suffix = marker(id);
  const lowerLabel = label.toLowerCase();
  return {
    organisationName: `Synthetic Rehearsal ${label}`,
    organisationSlug: `rehearsal-${lowerLabel}-${suffix}`,
    installerName: `Synthetic Installer ${label}`,
    installerSlug: `installer-${lowerLabel}-${suffix}`,
    seaiCompanyId: `SEAI-REHEARSAL-${lowerLabel}-${suffix}`,
    websiteDomain: `${lowerLabel}-${suffix}.pilot-rehearsal.example.test`,
    county: 'Synthetic County',
    ownerDisplayName: `Synthetic Owner ${label}`,
    ownerEmail: `${lowerLabel}-${suffix}@pilot-rehearsal.example.test`,
    approverUserId,
    idempotencyKey: `rehearsal-provision-${lowerLabel}-${suffix}`,
    environment: 'test'
  };
}

function recoveryInput(tenant: Tenant, approverUserId: string, idempotencyKey: string, reason: string): RecoveryInput {
  return {
    organisationId: tenant.result.organisation.id,
    installerId: tenant.result.installer.id,
    ownerUserId: tenant.result.owner.id,
    approverUserId,
    idempotencyKey,
    reason,
    environment: 'test'
  };
}

function passwordFor(label: string) {
  return `Northwind!Secure!${label}!${randomBytes(12).toString('base64url')}`;
}

async function createOperator(db: PrismaClient, id: string) {
  return db.$transaction(async (tx) => {
    const durableMarker = marker(id);
    const organisation = await tx.organisation.create({
      data: {
        name: `Synthetic Clada Internal ${id}`,
        slug: `rehearsal-internal-${durableMarker}`,
        type: 'CLADA_INTERNAL',
        status: 'ACTIVE',
        verified: true
      }
    });
    const user = await tx.user.create({
      data: {
        id: `rehearsal-operator-${durableMarker}`,
        email: `operator-${durableMarker}@pilot-rehearsal.example.test`,
        displayName: 'Synthetic Clada Operator',
        status: 'ACTIVE'
      }
    });
    await tx.organisationMembership.create({
      data: {
        organisationId: organisation.id,
        userId: user.id,
        status: 'ACTIVE',
        role: 'CLADA_INTERNAL_ADMIN',
        isOwner: false
      }
    });
    return { organisationId: organisation.id, userId: user.id };
  });
}

async function provisionTenant(db: PrismaClient, label: string, id: string, approverUserId: string, now: Date): Promise<Tenant> {
  const input = syntheticInput(label, id, approverUserId);
  const delivery = new RehearsalDeliveryAdapter();
  const result = await executeTenantProvisioning({
    db,
    input,
    deliveryAdapter: delivery,
    loginUrl: 'https://pilot-rehearsal.example.test/login',
    now
  });
  const credential = delivery.takeCredential();
  check(credential, `Synthetic ${label} delivery did not provide an in-memory test credential.`);
  return { label, input, result, delivery, credential };
}

async function activateTenant(db: PrismaClient, tenant: Tenant, now: Date) {
  const restricted = await authenticatePilotCredentials({
    email: tenant.result.owner.email,
    password: tenant.credential,
    db,
    now
  });
  check(restricted?.sessionKind === 'RESTRICTED_FIRST_LOGIN', `${tenant.label} did not create a restricted first-login session.`);
  tenant.restrictedSessionToken = restricted.sessionToken;
  const restrictedState = await getPilotSessionStateForSessionToken({ sessionToken: restricted.sessionToken, db, now });
  check(restrictedState?.kind === 'RESTRICTED_FIRST_LOGIN', `${tenant.label} restricted session did not resolve.`);
  check(await getPilotContextForSessionToken({ sessionToken: restricted.sessionToken, db, now }) === null, `${tenant.label} restricted session reached normal tenant context.`);
  check(restricted.expiresAt.getTime() <= tenant.result.owner.temporaryCredentialExpiresAt.getTime(), `${tenant.label} restricted session exceeded temporary credential expiry.`);

  const invalidSessionResult = await completePilotFirstLogin({
    sessionToken: 'invalid-rehearsal-session',
    currentCredential: tenant.credential,
    newPassword: passwordFor(`${tenant.label}-invalid`),
    confirmation: passwordFor(`${tenant.label}-invalid`),
    db,
    now
  });
  check(invalidSessionResult.code === 'RESTRICTED_SESSION_REQUIRED', `${tenant.label} accepted an invalid first-login session.`);

  const password = passwordFor(tenant.label);
  const failedReplacement = await completePilotFirstLogin({
    sessionToken: restricted.sessionToken,
    currentCredential: 'wrong synthetic credential',
    newPassword: password,
    confirmation: password,
    db,
    now
  });
  check(failedReplacement.code === 'CURRENT_CREDENTIAL_INVALID', `${tenant.label} accepted an invalid current credential.`);

  const activated = await completePilotFirstLogin({
    sessionToken: restricted.sessionToken,
    currentCredential: tenant.credential,
    newPassword: password,
    confirmation: password,
    db,
    now
  });
  check(activated.ok, `${tenant.label} first-login activation failed.`);
  tenant.password = password;
  tenant.normalSessionToken = activated.sessionToken;
  check(await getPilotSessionStateForSessionToken({ sessionToken: restricted.sessionToken, db, now }) === null, `${tenant.label} restricted session remained valid after activation.`);
  const owner = await db.user.findUniqueOrThrow({ where: { id: tenant.result.owner.id } });
  const organisation = await db.organisation.findUniqueOrThrow({ where: { id: tenant.result.organisation.id } });
  check(owner.status === 'ACTIVE' && owner.mustChangePassword === false && owner.temporaryCredentialExpiresAt === null, `${tenant.label} owner lifecycle did not activate.`);
  check(organisation.status === 'ACTIVE', `${tenant.label} organisation lifecycle did not activate.`);
  check(await db.authSession.count({ where: { userId: owner.id, sessionType: 'NORMAL' } }) === 1, `${tenant.label} did not create exactly one normal session.`);
}

async function addSyntheticLead(db: PrismaClient, tenant: Tenant, id: string) {
  const lead = await db.lead.create({
    data: {
      organisationId: tenant.result.organisation.id,
      installerId: tenant.result.installer.id,
      fullName: `Synthetic Homeowner ${tenant.label}`,
      email: `homeowner-${tenant.label.toLowerCase()}-${marker(id)}@pilot-rehearsal.example.test`,
      phone: '+353000000000',
      addressLine1: `Synthetic Street ${tenant.label}`,
      county: 'Synthetic County',
      propertyOwner: true,
      dwellingType: 'DETACHED',
      yearBuilt: 2018,
      mprn: `999999999${tenant.label.charCodeAt(0)}`,
      worksStarted: false,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: true
    }
  });
  await db.leadActivity.create({
      data: { leadId: lead.id, type: 'LEAD_CREATED', title: `Synthetic ${tenant.label} lead created ${marker(id)}` }
  });
  return lead.id;
}

async function auditSummary(
  db: PrismaClient,
  organisationId: string,
  expected: string[],
  expectedCounts: Readonly<Record<string, number>> = {}
) {
  const audits = await db.auditLog.findMany({
    where: { organisationId },
    select: { action: true, createdAt: true, metadataJson: true },
    orderBy: { createdAt: 'asc' }
  });
  return assertAuditEventChain(audits, expected, expectedCounts);
}

type RehearsalData = {
  stages: Stage[];
  organisationIds: string[];
  userIds: string[];
  leadIds: string[];
  operationIds: string[];
  auditCounts: Record<string, number>;
  status: 'PASSED' | 'FAILED';
  cleanup?: SyntheticCleanupSummary;
};

async function runRehearsal(db: PrismaClient, id: string): Promise<RehearsalData> {
  const stages: Stage[] = [];
  const organisationIds: string[] = [];
  const userIds: string[] = [];
  const leadIds: string[] = [];
  const operationIds: string[] = [];
  const auditCounts: Record<string, number> = {};
  const now = new Date('2026-07-20T10:00:00.000Z');
  let operator: { organisationId: string; userId: string } | undefined;
  let tenantA: Tenant | undefined;
  let tenantB: Tenant | undefined;
  let tenantC: Tenant | undefined;
  let tenantD: Tenant | undefined;

  const pass = (name: string, details?: Stage['details']) => stages.push({ name, status: 'PASSED', details });
  try {
    operator = await createOperator(db, id);
    organisationIds.push(operator.organisationId);
    userIds.push(operator.userId);
    pass('internal operator setup');

    tenantA = await provisionTenant(db, 'A', id, operator.userId, now);
    tenantB = await provisionTenant(db, 'B', id, operator.userId, new Date(now.getTime() + 1_000));
    check(operator && tenantA && tenantB, 'Synthetic operator or tenant setup did not complete.');
    organisationIds.push(tenantA.result.organisation.id, tenantB.result.organisation.id);
    userIds.push(tenantA.result.owner.id, tenantB.result.owner.id);
    operationIds.push(tenantA.result.operation.id, tenantB.result.operation.id);
    check(tenantA.result.owner.temporaryCredentialExpiresAt.getTime() - now.getTime() === 24 * 60 * 60 * 1000, 'Tenant A credential expiry was not exactly 24 hours.');
    check(tenantB.result.owner.temporaryCredentialExpiresAt.getTime() - (now.getTime() + 1_000) === 24 * 60 * 60 * 1000, 'Tenant B credential expiry was not exactly 24 hours.');
    const storedA = await db.user.findUniqueOrThrow({ where: { id: tenantA.result.owner.id } });
    const storedB = await db.user.findUniqueOrThrow({ where: { id: tenantB.result.owner.id } });
    check(storedA.passwordHash?.startsWith('$argon2') && storedB.passwordHash?.startsWith('$argon2'), 'Provisioning did not persist Argon2id hashes.');
    check(!storedA.passwordHash?.includes(tenantA.credential) && !storedB.passwordHash?.includes(tenantB.credential), 'A plaintext credential was persisted.');
    pass('synthetic tenant provisioning and fake delivery', { deliveryCountA: tenantA.delivery.safeDeliveryCount, deliveryCountB: tenantB.delivery.safeDeliveryCount });

    await activateTenant(db, tenantA, now);
    await activateTenant(db, tenantB, new Date(now.getTime() + 2_000));
    check(tenantA.delivery.safeDeliveryCount === 1 && tenantB.delivery.safeDeliveryCount === 1, 'Provisioning delivery was not exactly once per tenant.');
    pass('restricted first login and atomic activation');

    leadIds.push(await addSyntheticLead(db, tenantA, id), await addSyntheticLead(db, tenantB, id));
    const contextA = await resolveOrganisationContextForUser({ db, userId: tenantA.result.owner.id, organisationId: tenantA.result.organisation.id });
    check(contextA.organisationId === tenantA.result.organisation.id, 'Tenant A context did not resolve to its membership.');
    try {
      await resolveOrganisationContextForUser({ db, userId: tenantA.result.owner.id, organisationId: tenantB.result.organisation.id });
      throw new Error('Mismatched organisation context was accepted.');
    } catch (error) {
      check(error instanceof OrganisationContextError && error.code === 'INVALID_MEMBERSHIP', 'Mismatched organisation context returned an unexpected result.');
    }
    check(await db.lead.findFirst({ where: leadOrganisationWhere({ organisationId: tenantA.result.organisation.id }, { id: leadIds[1] }) }) === null, 'Tenant A read Tenant B data.');
    check(await db.lead.findFirst({ where: leadOrganisationWhere({ organisationId: tenantB.result.organisation.id }, { id: leadIds[0] }) }) === null, 'Tenant B read Tenant A data.');
    await assertRejectsAccess(() => updateLeadInOrganisation(db, { organisationId: tenantA!.result.organisation.id }, leadIds[1], { internalNotes: 'cross-tenant rehearsal attempt' }));
    check((await db.lead.findUniqueOrThrow({ where: { id: leadIds[1] } })).internalNotes === null, 'Cross-tenant update changed the target record.');
    pass('two-tenant isolation and restricted-session isolation');

    check(tenantA.normalSessionToken, 'Tenant A normal session was not created.');
    const suspendedUser = await executeTenantUserSuspension({ db, input: recoveryInput(tenantA, operator.userId, `rehearsal-suspend-user-${id}`, 'Synthetic suspension rehearsal') , now });
    operationIds.push(suspendedUser.operation.id);
    check(await getPilotSessionStateForSessionToken({ sessionToken: tenantA.normalSessionToken, db, now }) === null, 'Suspended user session remained valid.');
    await assertContextRefused(db, tenantA.result.owner.id, tenantA.result.organisation.id, 'INACTIVE_USER');
    check((await db.user.findUniqueOrThrow({ where: { id: tenantA.result.owner.id } })).status === 'INACTIVE', 'User suspension did not persist.');
    check(await db.lead.findUnique({ where: { id: leadIds[0] } }) !== null, 'User suspension deleted tenant records.');
    const userSuspendedInspection = await inspectTenantRecovery({ db, organisationId: tenantA.result.organisation.id, now });
    check(userSuspendedInspection.state === 'USER_SUSPENDED', 'User suspension inspection classification was incorrect.');
    const reactivatedUser = await executeTenantUserReactivation({ db, input: recoveryInput(tenantA, operator.userId, `rehearsal-reactivate-user-${id}`, 'Synthetic reactivation rehearsal'), now });
    operationIds.push(reactivatedUser.operation.id);
    check(await db.authSession.count({ where: { userId: tenantA.result.owner.id } }) === 0, 'User reactivation issued a session automatically.');
    const resumedLogin = await authenticatePilotCredentials({ email: tenantA.result.owner.email, password: tenantA.password!, db, now });
    check(resumedLogin?.sessionKind === 'NORMAL', 'Reactivated user could not authenticate normally.');
    tenantA.normalSessionToken = resumedLogin.sessionToken;
    const suspendedOrganisation = await executeTenantOrganisationSuspension({ db, input: recoveryInput(tenantA, operator.userId, `rehearsal-suspend-org-${id}`, 'Synthetic organisation suspension rehearsal'), now });
    operationIds.push(suspendedOrganisation.operation.id);
    check(await getPilotSessionStateForSessionToken({ sessionToken: tenantA.normalSessionToken, db, now }) === null, 'Organisation suspension left a stale session valid.');
    await assertContextRefused(db, tenantA.result.owner.id, tenantA.result.organisation.id, 'INACTIVE_ORGANISATION');
    check((await db.organisation.findUniqueOrThrow({ where: { id: tenantA.result.organisation.id } })).status === 'INACTIVE', 'Organisation suspension did not persist.');
    check(await db.lead.findUnique({ where: { id: leadIds[0] } }) !== null, 'Organisation suspension deleted tenant records.');
    const organisationSuspendedInspection = await inspectTenantRecovery({ db, organisationId: tenantA.result.organisation.id, now });
    check(organisationSuspendedInspection.state === 'ORGANISATION_SUSPENDED', 'Organisation suspension inspection classification was incorrect.');
    const reactivatedOrganisation = await executeTenantOrganisationReactivation({ db, input: recoveryInput(tenantA, operator.userId, `rehearsal-reactivate-org-${id}`, 'Synthetic organisation reactivation rehearsal'), now });
    operationIds.push(reactivatedOrganisation.operation.id);
    check(await db.authSession.count({ where: { userId: tenantA.result.owner.id } }) === 0, 'Organisation reactivation issued a session automatically.');
    check(await getPilotSessionStateForSessionToken({ sessionToken: tenantA.normalSessionToken, db, now }) === null, 'A stale pre-suspension session became valid after reactivation.');
    pass('user and organisation suspension, inspection, reactivation and session invalidation');

    tenantC = await provisionTenant(db, 'C', id, operator.userId, new Date(now.getTime() + 5_000));
    organisationIds.push(tenantC.result.organisation.id);
    userIds.push(tenantC.result.owner.id);
    operationIds.push(tenantC.result.operation.id);
    const expiryNow = new Date(tenantC.result.owner.temporaryCredentialExpiresAt.getTime() + 1);
    check(await authenticatePilotCredentials({ email: tenantC.result.owner.email, password: tenantC.credential, db, now: expiryNow }) === null, 'Expired credential authenticated.');
    const expiredInspection = await inspectTenantRecovery({ db, organisationId: tenantC.result.organisation.id, now: expiryNow });
    check(expiredInspection.state === 'INVITED_CREDENTIAL_EXPIRED', 'Expired credential inspection classification was incorrect.');
    const previousHash = (await db.user.findUniqueOrThrow({ where: { id: tenantC.result.owner.id } })).passwordHash;
    const reissueNow = new Date(expiryNow.getTime() + 1_000);
    const reissueInput = recoveryInput(tenantC, operator.userId, `rehearsal-reissue-${id}`, 'Synthetic credential reissue rehearsal');
    const reissued = await executeTenantCredentialReissue({ db, input: reissueInput, deliveryAdapter: tenantC.delivery, now: reissueNow, loginUrl: 'https://pilot-rehearsal.example.test/login' });
    operationIds.push(reissued.operation.id);
    const reissuedCredential = tenantC.delivery.takeCredential();
    check(reissuedCredential, 'Credential reissue did not produce an in-memory test credential.');
    const newOwner = await db.user.findUniqueOrThrow({ where: { id: tenantC.result.owner.id } });
    check(newOwner.passwordHash !== previousHash && newOwner.passwordHash?.startsWith('$argon2'), 'Credential reissue did not replace the stored Argon2id hash.');
    check(newOwner.temporaryCredentialExpiresAt?.getTime() === reissueNow.getTime() + 24 * 60 * 60 * 1000, 'Credential reissue expiry was not exactly 24 hours.');
    check(await authenticatePilotCredentials({ email: tenantC.result.owner.email, password: tenantC.credential, db, now: reissueNow }) === null, 'The previous credential authenticated after reissue.');
    const reissuedLogin = await authenticatePilotCredentials({ email: tenantC.result.owner.email, password: reissuedCredential, db, now: reissueNow });
    check(reissuedLogin?.sessionKind === 'RESTRICTED_FIRST_LOGIN', 'Reissued credential did not follow the restricted first-login path.');
    check(await getPilotContextForSessionToken({ sessionToken: reissuedLogin.sessionToken, db, now: reissueNow }) === null, 'Reissued restricted session reached normal tenant context.');
    const replay = await executeTenantCredentialReissue({ db, input: reissueInput, deliveryAdapter: tenantC.delivery, now: new Date(reissueNow.getTime() + 1_000), loginUrl: 'https://pilot-rehearsal.example.test/login' });
    check(replay.idempotentReplay && tenantC.delivery.safeDeliveryCount === 2, 'Credential reissue replay delivered or mutated again.');
    check(replay.revokedSessionCount === reissued.revokedSessionCount, 'Credential reissue replay changed the revoked-session count.');
    await invalidatePilotSession({ sessionToken: reissuedLogin.sessionToken, db });
    pass('credential expiry, Argon2id reissue, restricted path and exact replay', { deliveryCount: tenantC.delivery.safeDeliveryCount });

    tenantD = await provisionTenant(db, 'D', id, operator.userId, new Date(now.getTime() + 7_000));
    organisationIds.push(tenantD.result.organisation.id);
    userIds.push(tenantD.result.owner.id);
    operationIds.push(tenantD.result.operation.id);
    const failureNow = new Date(tenantD.result.owner.temporaryCredentialExpiresAt.getTime() + 1);
    const failureInput = recoveryInput(tenantD, operator.userId, `rehearsal-reissue-failure-${id}`, 'Synthetic delivery failure rehearsal');
    await assertRejectsCode(() => executeTenantCredentialReissue({ db, input: failureInput, deliveryAdapter: new FailingCredentialDeliveryAdapter(), now: failureNow }), 'DELIVERY_FAILED');
    const failedOperation = await db.provisioningOperation.findUniqueOrThrow({ where: { idempotencyKey: failureInput.idempotencyKey } });
    operationIds.push(failedOperation.id);
    const failedOwner = await db.user.findUniqueOrThrow({ where: { id: tenantD.result.owner.id } });
    check(failedOperation.status === 'FAILED' && failedOwner.status === 'INVITED' && failedOwner.mustChangePassword, 'Failed delivery did not leave the owner safely invited.');
    check((await db.organisation.findUniqueOrThrow({ where: { id: tenantD.result.organisation.id } })).status === 'PROVISIONING', 'Failed delivery changed organisation lifecycle.');
    check(await authenticatePilotCredentials({ email: tenantD.result.owner.email, password: tenantD.credential, db, now: failureNow }) === null, 'A failed-delivery credential authenticated.');
    const failureInspection = await inspectTenantRecovery({ db, organisationId: tenantD.result.organisation.id, now: failureNow });
    check(failureInspection.state === 'DELIVERY_FAILED', 'Failed delivery inspection classification was incorrect.');
    pass('delivery failure revocation and safe failed recovery state');

    const rollbackInput = syntheticInput('rollback', id, operator.userId);
    const faultDb = new PrismaClient();
    faultDb.$use(async (params, next) => {
      if (params.model === 'AuditLog' && params.action === 'create') throw new Error('synthetic rehearsal audit failure');
      return next(params);
    });
    try {
      await assertRejectsCode(() => executeTenantProvisioning({ db: faultDb, input: rollbackInput, deliveryAdapter: new RehearsalDeliveryAdapter(), loginUrl: 'https://pilot-rehearsal.example.test/login' }), 'TRANSACTION_FAILED');
    } finally {
      await faultDb.$disconnect();
    }
    check(await db.organisation.count({ where: { slug: rollbackInput.organisationSlug } }) === 0, 'Provisioning rollback left an organisation row.');
    check(await db.user.count({ where: { email: rollbackInput.ownerEmail } }) === 0, 'Provisioning rollback left an owner row.');
    check(await db.provisioningOperation.count({ where: { idempotencyKey: rollbackInput.idempotencyKey } }) === 0, 'Provisioning rollback left an operation row.');
    const duplicateSlugPlan = await planTenantProvisioning(db, { ...syntheticInput('duplicate-slug', id, operator.userId), organisationSlug: tenantA.input.organisationSlug });
    check(!duplicateSlugPlan.safeToExecute && duplicateSlugPlan.conflicts.some(({ code }) => code === 'ORGANISATION_SLUG_CONFLICT'), 'Duplicate organisation slug was not refused.');
    const duplicateOwnerPlan = await planTenantProvisioning(db, { ...syntheticInput('duplicate-owner', id, operator.userId), ownerEmail: tenantA.input.ownerEmail });
    check(!duplicateOwnerPlan.safeToExecute && duplicateOwnerPlan.conflicts.some(({ code }) => code === 'OWNER_EMAIL_CONFLICT'), 'Duplicate owner email was not refused.');
    await assertRejectsCode(() => executeTenantProvisioning({ db, input: { ...tenantA!.input, county: 'Another Synthetic County' }, deliveryAdapter: new RehearsalDeliveryAdapter(), loginUrl: 'https://pilot-rehearsal.example.test/login' }), 'PROVISIONING_CONFLICT');
    pass('rollback, duplicate conflicts and idempotency mismatch');

    const staleKey = `rehearsal-stale-${id}`;
    let injectedStaleState = false;
    const raceDb = db.$extends({
      query: {
        provisioningOperation: {
          async findUnique({ args, query }) {
            const result = await query(args);
            if (!injectedStaleState && args.where.idempotencyKey === staleKey) {
              injectedStaleState = true;
              await db.user.update({ where: { id: tenantB!.result.owner.id }, data: { status: 'INACTIVE' } });
            }
            return result;
          }
        }
      }
    });
    await assertRejectsCode(() => executeTenantUserSuspension({ db: raceDb as unknown as PrismaClient, input: recoveryInput(tenantB!, operator!.userId, staleKey, 'Synthetic stale lifecycle rehearsal'), now }), 'RECOVERY_REFUSED');
    check(await db.provisioningOperation.count({ where: { idempotencyKey: staleKey } }) === 0, 'Stale recovery state created an operation.');
    await db.user.update({ where: { id: tenantB.result.owner.id }, data: { status: 'ACTIVE' } });
    const inactiveApproverKey = `rehearsal-inactive-approver-${id}`;
    const approverPlan = await planTenantUserSuspension({ db, input: recoveryInput(tenantB!, operator!.userId, inactiveApproverKey, 'Synthetic inactive approver rehearsal'), now });
    check(approverPlan.safeToExecute, 'Baseline approver plan was not executable.');
    await db.user.update({ where: { id: operator.userId }, data: { status: 'INACTIVE' } });
    await assertRejectsCode(() => executeTenantUserSuspension({ db, input: recoveryInput(tenantB!, operator!.userId, inactiveApproverKey, 'Synthetic inactive approver rehearsal'), now }), 'APPROVER_NOT_AUTHORISED');
    await db.user.update({ where: { id: operator.userId }, data: { status: 'ACTIVE' } });
    const mismatchInput = recoveryInput(tenantA, operator.userId, `rehearsal-cross-tenant-${id}`, 'Synthetic cross-tenant target mismatch');
    await assertRejectsCode(() => planTenantUserSuspension({ db, input: { ...mismatchInput, installerId: tenantB!.result.installer.id, ownerUserId: tenantB!.result.owner.id }, now }), 'RECOVERY_REFUSED');
    pass('stale lifecycle, inactive approver and cross-tenant recovery refusal');

    const auditA = await auditSummary(
      db,
      tenantA.result.organisation.id,
      ['TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED', 'PROVISIONING_COMPLETED', 'INVITED_LOGIN_SUCCEEDED', 'RESTRICTED_SESSION_CREATED', 'FIRST_LOGIN_ACTIVATION_FAILED', 'PASSWORD_CHANGED', 'USER_ACTIVATED', 'ORGANISATION_ACTIVATED', 'NORMAL_SESSION_CREATED', 'USER_SUSPENDED', 'RECOVERY_INSPECTION_PERFORMED', 'USER_REACTIVATED', 'ORGANISATION_SUSPENDED', 'RECOVERY_INSPECTION_PERFORMED', 'ORGANISATION_REACTIVATED'],
      {
        PROVISIONING_COMPLETED: 1,
        TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED: 1,
        RESTRICTED_SESSION_CREATED: 1,
        NORMAL_SESSION_CREATED: 1,
        RECOVERY_INSPECTION_PERFORMED: 2
      }
    );
    const auditC = await auditSummary(
      db,
      tenantC.result.organisation.id,
      ['TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED', 'PROVISIONING_COMPLETED', 'CREDENTIAL_EXPIRED', 'RECOVERY_INSPECTION_PERFORMED', 'CREDENTIAL_REISSUE_STARTED', 'PREVIOUS_CREDENTIAL_REVOKED', 'SESSIONS_INVALIDATED', 'CREDENTIAL_REISSUE_DELIVERED', 'RECOVERY_OPERATION_COMPLETED'],
      {
        PROVISIONING_COMPLETED: 1,
        TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED: 2,
        CREDENTIAL_REISSUE_DELIVERED: 1,
        RECOVERY_OPERATION_COMPLETED: 1
      }
    );
    const auditD = await auditSummary(
      db,
      tenantD.result.organisation.id,
      ['TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED', 'PROVISIONING_COMPLETED', 'CREDENTIAL_REISSUE_STARTED', 'PREVIOUS_CREDENTIAL_REVOKED', 'CREDENTIAL_REISSUE_FAILED', 'TEMPORARY_CREDENTIAL_DELIVERY_FAILED', 'RECOVERY_OPERATION_FAILED'],
      {
        PROVISIONING_COMPLETED: 1,
        TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED: 1,
        CREDENTIAL_REISSUE_DELIVERED: 0,
        CREDENTIAL_REISSUE_FAILED: 1,
        TEMPORARY_CREDENTIAL_DELIVERY_FAILED: 1,
        RECOVERY_OPERATION_FAILED: 1
      }
    );
    auditCounts.A = auditA.count;
    auditCounts.C = auditC.count;
    auditCounts.D = auditD.count;
    pass('safe audit-chain and report sanitisation assertions', { auditCountA: auditA.count, auditCountC: auditC.count, auditCountD: auditD.count });

    return { stages, organisationIds, userIds, leadIds, operationIds, auditCounts, status: 'PASSED' as const };
  } catch (error) {
    stages.push({ name: 'rehearsal failure', status: 'FAILED' });
    const failure = error instanceof Error ? error : new Error('Pilot rehearsal failed.');
    Object.assign(failure, {
      rehearsalContext: {
        stages,
        organisationIds,
        userIds,
        leadIds,
        operationIds,
        auditCounts,
        status: 'FAILED' as const
      }
    });
    throw failure;
  }
}

async function assertRejectsAccess(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    check(error instanceof OrganisationRecordAccessError, 'Cross-tenant access returned an unexpected error.');
    return;
  }
  throw new Error('Cross-tenant access was not refused.');
}

async function assertContextRefused(db: PrismaClient, userId: string, organisationId: string, code: string) {
  try {
    await resolveOrganisationContextForUser({ db, userId, organisationId });
  } catch (error) {
    check(error instanceof OrganisationContextError && error.code === code, `Expected organisation context refusal ${code}.`);
    return;
  }
  throw new Error(`Expected organisation context refusal ${code}.`);
}

async function assertRejectsCode(action: () => Promise<unknown>, code: string) {
  try {
    await action();
  } catch (error) {
    check(error instanceof TenantProvisioningError || error instanceof TenantRecoveryError, 'Unexpected rehearsal error type.');
    check(error.code === code, `Expected ${code} but received ${error.code}.`);
    return;
  }
  throw new Error(`Expected ${code} refusal.`);
}

function safeErrorCode(error: unknown) {
  if (error instanceof TenantProvisioningError || error instanceof TenantRecoveryError) return error.code;
  if (error instanceof Error && error.name === 'DatabaseSafetyError') return 'DATABASE_SAFETY_REFUSED';
  return 'REHEARSAL_FAILED';
}

function guardDatabase(mode: Options['mode']) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const guarded = assertDatabaseOperationAllowed({
    operation: mode === 'execute' ? 'destructive-test' : 'read-only-diagnostic',
    appEnvironment: process.env.APP_ENV,
    databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
    databaseUrl,
    expectedFingerprint: process.env.DATABASE_FINGERPRINT,
    productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: process.env.DATABASE_BRANCH_ID
  });
  assertDisposableTestDatabase(guarded.identity, {
    production: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    preview: process.env.PREVIEW_DATABASE_FINGERPRINT,
    development: process.env.DEVELOPMENT_DATABASE_FINGERPRINT
  });
  if (!['127.0.0.1', 'localhost', '::1'].includes(guarded.identity.host)) {
    throw new Error('Pilot rehearsal requires a local disposable PostgreSQL host.');
  }
  return guarded;
}

function plannedStages() {
  return [
    'internal operator setup',
    'synthetic tenant provisioning and fake delivery',
    'restricted first login and atomic activation',
    'two-tenant isolation and restricted-session isolation',
    'user and organisation suspension, inspection, reactivation and session invalidation',
    'credential expiry, Argon2id reissue, restricted path and exact replay',
    'delivery failure revocation and safe failed recovery state',
    'rollback, duplicate conflicts and idempotency mismatch',
    'stale lifecycle, inactive approver and cross-tenant recovery refusal',
    'safe audit-chain and report sanitisation assertions'
  ];
}

async function main() {
  let options: Options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: { code: 'INPUT_INVALID', message: error instanceof Error ? error.message : 'Invalid command.' } }));
    process.exit(2);
    return;
  }
  if (options.help) {
    console.log(HELP);
    return;
  }

  let guarded;
  try {
    guarded = guardDatabase(options.mode);
  } catch {
    console.error(JSON.stringify({ ok: false, error: { code: 'DATABASE_GUARD_DENIED', message: 'Pilot rehearsal database safety guard denied the requested database.' } }));
    process.exitCode = 4;
    return;
  }

  if (options.mode === 'dry-run') {
    console.log(JSON.stringify({
      ok: true,
      mode: 'dry-run',
      databaseFingerprint: guarded.identity.fingerprint,
      plannedStages: plannedStages(),
      cleanup: 'If executed, synthetic rows would be discovered by rehearsal ID, removed in foreign-key-safe order, and verified absent; reports would be written only under ignored .tools/pilot-rehearsal.'
    }, null, 2));
    return;
  }

  if (!process.env.AUTH_SESSION_PEPPER || process.env.AUTH_SESSION_PEPPER.length < 32) {
    console.error(JSON.stringify({ ok: false, error: { code: 'INPUT_REQUIRED', message: 'A test-only AUTH_SESSION_PEPPER with at least 32 characters is required.' } }));
    process.exitCode = 2;
    return;
  }

  const id = rehearsalId();
  const db = new PrismaClient();
  let rehearsal: RehearsalData | undefined;
  let failureCode: string | undefined;
  try {
    rehearsal = await runRehearsal(db, id);
  } catch (error) {
    failureCode = safeErrorCode(error);
    rehearsal = (error as { rehearsalContext?: RehearsalData }).rehearsalContext;
  }
  const cleanupIds: SyntheticCleanupTrackedIds = rehearsal ?? { organisationIds: [], userIds: [], leadIds: [] };
  let cleanupSucceeded = false;
  let cleanupSummary: SyntheticCleanupSummary | undefined;
  try {
    cleanupSummary = await cleanupSyntheticData(db, id, cleanupIds);
    cleanupSucceeded = cleanupSummary.verificationPassed;
    if (!cleanupSucceeded) failureCode = failureCode ?? 'CLEANUP_VERIFICATION_FAILED';
  } catch (error) {
    failureCode = failureCode ?? 'CLEANUP_FAILED';
    if (error instanceof SyntheticCleanupError) cleanupSummary = error.summary;
  } finally {
    await db.$disconnect();
  }

  const report = {
    rehearsalId: id,
    databaseFingerprint: guarded.identity.fingerprint,
    status: rehearsal && !failureCode && cleanupSucceeded ? 'PASSED' as const : 'FAILED' as const,
    syntheticDataOnly: true,
    cleanupSucceeded,
    stages: rehearsal?.stages ?? [{ name: 'rehearsal execution', status: 'FAILED' as const }],
    syntheticOrganisationIds: rehearsal?.organisationIds ?? [],
    syntheticUserIds: rehearsal?.userIds ?? [],
    syntheticLeadIds: rehearsal?.leadIds ?? [],
    safeOperationIds: rehearsal?.operationIds ?? [],
    auditEventCounts: rehearsal?.auditCounts ?? {},
    cleanup: cleanupSummary ?? {
      discoveredRecordCount: 0,
      deletedRecordCount: 0,
      remainingRecordCount: 0,
      verificationPassed: false
    },
    readinessGaps: [
      'Production execution remains disabled.',
      'Real transactional email remains disabled; the rehearsal uses fake/test delivery only.',
      'External pilot onboarding remains disabled until separate Production validation approval.'
    ]
  };
  assertRehearsalSecretFree(report);
  const reportDir = join(process.cwd(), '.tools', 'pilot-rehearsal');
  mkdirSync(reportDir, { recursive: true });
  const jsonPath = join(reportDir, `${id}.json`);
  const markdownPath = join(reportDir, `${id}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, buildRehearsalMarkdown(report), 'utf8');
  const output = {
    ok: report.status === 'PASSED',
    mode: 'execute',
    rehearsal: {
      rehearsalId: report.rehearsalId,
      status: report.status,
      databaseFingerprint: report.databaseFingerprint,
      stagesPassed: report.stages.filter((stage) => stage.status === 'PASSED').length,
      stagesTotal: report.stages.length,
      cleanupSucceeded: report.cleanupSucceeded,
      failureCode: failureCode ?? null,
      reportFiles: [relative(process.cwd(), jsonPath), relative(process.cwd(), markdownPath)],
      readinessGaps: report.readinessGaps
    }
  };
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exitCode = failureCode?.startsWith('CLEANUP') ? 5 : 1;
}

void main();
