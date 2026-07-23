import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import type { OrganisationContext } from '../../lib/identity';
import { createManualLead, findManualLeadDuplicates, manualLeadSchema, ManualLeadError } from '../../lib/manual-lead';
import { ManualLeadPrivacyGateError } from '../../lib/manual-lead-privacy';
import { AuthorizationError } from '../../lib/permissions';

const prisma = new PrismaClient();
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const ids = {
  orgA: `org_manual_a_${suffix}`,
  orgB: `org_manual_b_${suffix}`,
  installerA: `installer_manual_a_${suffix}`,
  installerB: `installer_manual_b_${suffix}`,
  userMember: `user_manual_member_${suffix}`,
  userAdmin: `user_manual_admin_${suffix}`,
  userInactive: `user_manual_inactive_${suffix}`,
  userOther: `user_manual_other_${suffix}`,
  member: `membership_manual_member_${suffix}`,
  admin: `membership_manual_admin_${suffix}`,
  inactive: `membership_manual_inactive_${suffix}`,
  other: `membership_manual_other_${suffix}`
};

function context(role: OrganisationContext['role'], membershipId: string, userId: string, organisationId = ids.orgA): OrganisationContext {
  return {
    organisationId,
    organisationName: organisationId === ids.orgA ? 'Manual Test A' : 'Manual Test B',
    organisationType: 'INSTALLER',
    membershipId,
    isOwner: role === 'ORGANISATION_OWNER',
    role,
    actor: { actorType: 'human_user', userId, displayName: `Synthetic actor ${suffix}`, email: `${userId}@example.test` }
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return manualLeadSchema.parse({
    fullName: `Synthetic Manual Customer ${suffix}`,
    phone: '+353 87 000 1234',
    requestId: `manual_request_${randomUUID().replaceAll('-', '')}`,
    ...overrides
  });
}

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { organisationId: { in: [ids.orgA, ids.orgB] } } });
  await prisma.workflowHistory.deleteMany({ where: { organisationId: { in: [ids.orgA, ids.orgB] } } });
  await prisma.workflowInstance.deleteMany({ where: { organisationId: { in: [ids.orgA, ids.orgB] } } });
  await prisma.leadActivity.deleteMany({ where: { actorOrganisationId: { in: [ids.orgA, ids.orgB] } } });
  await prisma.lead.deleteMany({ where: { organisationId: { in: [ids.orgA, ids.orgB] } } });
  await prisma.installer.deleteMany({ where: { id: { in: [ids.installerA, ids.installerB] } } });
  await prisma.organisationMembership.deleteMany({ where: { id: { in: [ids.member, ids.admin, ids.inactive, ids.other] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.userMember, ids.userAdmin, ids.userInactive, ids.userOther] } } });
  await prisma.organisation.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB] } } });
}

test.before(async () => {
  await cleanup();
  await prisma.organisation.createMany({ data: [
    { id: ids.orgA, name: 'Manual Test A', slug: `manual-test-a-${suffix}`, type: 'INSTALLER', status: 'ACTIVE', verified: true },
    { id: ids.orgB, name: 'Manual Test B', slug: `manual-test-b-${suffix}`, type: 'INSTALLER', status: 'ACTIVE', verified: true }
  ] });
  await prisma.installer.createMany({ data: [
    { id: ids.installerA, organisationId: ids.orgA, name: 'Installer A', slug: `manual-installer-a-${suffix}`, seaiCompanyId: `MANUAL-A-${suffix}` },
    { id: ids.installerB, organisationId: ids.orgB, name: 'Installer B', slug: `manual-installer-b-${suffix}`, seaiCompanyId: `MANUAL-B-${suffix}` }
  ] });
  await prisma.user.createMany({ data: [
    { id: ids.userMember, email: `member-${suffix}@example.test`, displayName: 'Synthetic Member', status: 'ACTIVE' },
    { id: ids.userAdmin, email: `admin-${suffix}@example.test`, displayName: 'Synthetic Admin', status: 'ACTIVE' },
    { id: ids.userInactive, email: `inactive-${suffix}@example.test`, displayName: 'Synthetic Inactive', status: 'ACTIVE' },
    { id: ids.userOther, email: `other-${suffix}@example.test`, displayName: 'Synthetic Other', status: 'ACTIVE' }
  ] });
  await prisma.organisationMembership.createMany({ data: [
    { id: ids.member, organisationId: ids.orgA, userId: ids.userMember, role: 'ORGANISATION_MEMBER', status: 'ACTIVE' },
    { id: ids.admin, organisationId: ids.orgA, userId: ids.userAdmin, role: 'ORGANISATION_ADMIN', status: 'ACTIVE' },
    { id: ids.inactive, organisationId: ids.orgA, userId: ids.userInactive, role: 'ORGANISATION_MEMBER', status: 'INACTIVE' },
    { id: ids.other, organisationId: ids.orgB, userId: ids.userOther, role: 'ORGANISATION_ADMIN', status: 'ACTIVE' }
  ] });
});

test.after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test('manual creation is tenant-derived, atomic, attributed, incomplete and idempotent', async () => {
  const memberContext = context('ORGANISATION_MEMBER', ids.member, ids.userMember);
  const request = input({ email: `manual-${suffix}@example.test`, initialNote: 'Synthetic internal note', followUpDate: '2026-08-01' });
  const created = await createManualLead({ db: prisma, context: memberContext, input: request });
  const replay = await createManualLead({ db: prisma, context: memberContext, input: request });
  assert.equal(replay.leadId, created.leadId);
  assert.equal(replay.replayed, true);

  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: created.leadId },
    include: { activities: true }
  });
  assert.equal(lead.organisationId, ids.orgA);
  assert.equal(lead.installerId, ids.installerA);
  assert.equal(lead.creationOrigin, 'MANUAL_INSTALLER');
  assert.equal(lead.createdByMembershipId, ids.member);
  assert.equal(lead.addressLine1, null);
  assert.equal(lead.county, null);
  assert.equal(lead.propertyOwner, null);
  assert.equal(lead.worksStarted, null);
  assert.equal(lead.consentToProcess, null);
  assert.equal(lead.portalToken, null);
  assert.equal(lead.likelyEligible, null);
  assert.equal(lead.activities.filter((activity) => activity.type === 'LEAD_CREATED').length, 1);
  assert.equal(lead.activities.filter((activity) => activity.type === 'NOTE_ADDED').length, 1);
  assert.equal(await prisma.workflowInstance.count({ where: { organisationId: ids.orgA, resourceType: 'lead', resourceId: lead.id } }), 1);
  assert.equal(await prisma.auditLog.count({ where: { leadId: lead.id, action: 'lead.created', outcome: 'SUCCEEDED' } }), 1);

  const audit = await prisma.auditLog.findFirstOrThrow({ where: { leadId: lead.id, action: 'lead.created' } });
  const metadata = JSON.stringify(audit.metadataJson);
  assert.doesNotMatch(metadata, /Synthetic internal note|manual-.*@example\.test|353870001234/i);

  const duplicates = await findManualLeadDuplicates({ db: prisma, context: memberContext, input: request });
  assert.equal(duplicates.length, 1);
  assert.deepEqual(duplicates[0].matchingSignals.sort(), ['email', 'phone']);
  const crossTenant = await findManualLeadDuplicates({
    db: prisma,
    context: context('ORGANISATION_ADMIN', ids.other, ids.userOther, ids.orgB),
    input: request
  });
  assert.deepEqual(crossTenant, []);
});

test('manual creation is blocked at the service boundary without privacy enablement and creates no records', async () => {
  const previous = process.env.MANUAL_LEAD_CREATION_ENABLED;
  process.env.MANUAL_LEAD_CREATION_ENABLED = 'false';
  const before = {
    leads: await prisma.lead.count({ where: { organisationId: ids.orgA } }),
    workflows: await prisma.workflowInstance.count({ where: { organisationId: ids.orgA } }),
    activities: await prisma.leadActivity.count({ where: { actorOrganisationId: ids.orgA } }),
    audits: await prisma.auditLog.count({ where: { organisationId: ids.orgA } })
  };

  try {
    await assert.rejects(
      () => createManualLead({
        db: prisma,
        context: context('ORGANISATION_MEMBER', ids.member, ids.userMember),
        input: input()
      }),
      (error) => error instanceof ManualLeadPrivacyGateError
        && error.code === 'MANUAL_LEAD_PRIVACY_GATE_CLOSED'
    );
  } finally {
    if (previous === undefined) delete process.env.MANUAL_LEAD_CREATION_ENABLED;
    else process.env.MANUAL_LEAD_CREATION_ENABLED = previous;
  }

  assert.deepEqual({
    leads: await prisma.lead.count({ where: { organisationId: ids.orgA } }),
    workflows: await prisma.workflowInstance.count({ where: { organisationId: ids.orgA } }),
    activities: await prisma.leadActivity.count({ where: { actorOrganisationId: ids.orgA } }),
    audits: await prisma.auditLog.count({ where: { organisationId: ids.orgA } })
  }, before);
});

test('manual request idempotency is organisation scoped and rejects changed same-tenant payloads', async () => {
  const requestId = `manual_shared_${suffix}_1234567890`;
  const request = input({ requestId, email: `shared-${suffix}@example.test` });
  const orgAContext = context('ORGANISATION_ADMIN', ids.admin, ids.userAdmin);
  const orgBContext = context('ORGANISATION_ADMIN', ids.other, ids.userOther, ids.orgB);

  const orgA = await createManualLead({ db: prisma, context: orgAContext, input: request });
  const orgB = await createManualLead({ db: prisma, context: orgBContext, input: request });
  assert.notEqual(orgA.leadId, orgB.leadId);

  const orgBReplay = await createManualLead({ db: prisma, context: orgBContext, input: request });
  assert.equal(orgBReplay.leadId, orgB.leadId);
  assert.notEqual(orgBReplay.leadId, orgA.leadId);

  await assert.rejects(
    () => createManualLead({
      db: prisma,
      context: orgAContext,
      input: input({ requestId, email: `changed-${suffix}@example.test` })
    }),
    (error) => error instanceof ManualLeadError && error.code === 'IDEMPOTENCY_CONFLICT'
  );

  const records = await prisma.lead.findMany({
    where: { manualCreationRequestId: requestId },
    select: { id: true, organisationId: true }
  });
  assert.deepEqual(
    records.map((record) => record.organisationId).sort(),
    [ids.orgA, ids.orgB].sort()
  );
});

test('concurrent exact replay creates one manual lead in the organisation', async () => {
  const requestId = `manual_concurrent_${suffix}_123456`;
  const request = input({ requestId });
  const organisationContext = context('ORGANISATION_MEMBER', ids.member, ids.userMember);
  const [first, second] = await Promise.all([
    createManualLead({ db: prisma, context: organisationContext, input: request }),
    createManualLead({ db: prisma, context: organisationContext, input: request })
  ]);

  assert.equal(first.leadId, second.leadId);
  assert.equal(await prisma.lead.count({
    where: { organisationId: ids.orgA, manualCreationRequestId: requestId }
  }), 1);
});

test('assignment requires permission and an active same-organisation membership', async () => {
  const base = { assignedMembershipId: ids.admin };
  await assert.rejects(
    () => createManualLead({ db: prisma, context: context('ORGANISATION_MEMBER', ids.member, ids.userMember), input: input(base) }),
    (error) => error instanceof AuthorizationError && error.code === 'PERMISSION_DENIED'
  );
  for (const assignedMembershipId of [ids.inactive, ids.other]) {
    await assert.rejects(
      () => createManualLead({ db: prisma, context: context('ORGANISATION_ADMIN', ids.admin, ids.userAdmin), input: input({ assignedMembershipId }) }),
      (error) => error instanceof ManualLeadError && error.code === 'ASSIGNEE_NOT_FOUND'
    );
  }
  const created = await createManualLead({
    db: prisma,
    context: context('ORGANISATION_ADMIN', ids.admin, ids.userAdmin),
    input: input({ assignedMembershipId: ids.member })
  });
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: created.leadId } });
  assert.equal(lead.assignedMembershipId, ids.member);
});

test('denied and invalid requests create no partial records or successful audit', async () => {
  const before = await prisma.lead.count({ where: { organisationId: ids.orgA } });
  await assert.rejects(
    () => createManualLead({
      db: prisma,
      context: context('SERVICE_ACTOR', ids.member, ids.userMember),
      input: input()
    }),
    (error) => error instanceof AuthorizationError && error.code === 'PERMISSION_DENIED'
  );
  assert.equal(await prisma.lead.count({ where: { organisationId: ids.orgA } }), before);
});

test('a required activity failure rolls back the lead, workflow and audit atomically', async () => {
  const requestId = `manual_rollback_${suffix}_123456`;
  const functionName = `fail_manual_activity_${suffix}`;
  const triggerName = `fail_manual_activity_trigger_${suffix}`;
  const before = {
    leads: await prisma.lead.count({ where: { organisationId: ids.orgA } }),
    workflows: await prisma.workflowInstance.count({ where: { organisationId: ids.orgA } }),
    audits: await prisma.auditLog.count({ where: { organisationId: ids.orgA } }),
    activities: await prisma.leadActivity.count({ where: { actorOrganisationId: ids.orgA } })
  };

  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM "Lead"
        WHERE "id" = NEW."leadId"
          AND "manualCreationRequestId" = '${requestId}'
      ) THEN
        RAISE EXCEPTION 'synthetic required activity failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER "${triggerName}"
    BEFORE INSERT ON "LeadActivity"
    FOR EACH ROW EXECUTE FUNCTION "${functionName}"()
  `);

  try {
    await assert.rejects(() => createManualLead({
      db: prisma,
      context: context('ORGANISATION_MEMBER', ids.member, ids.userMember),
      input: input({ requestId })
    }));
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "LeadActivity"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
  }

  assert.equal(await prisma.lead.findFirst({
    where: { organisationId: ids.orgA, manualCreationRequestId: requestId }
  }), null);
  assert.deepEqual({
    leads: await prisma.lead.count({ where: { organisationId: ids.orgA } }),
    workflows: await prisma.workflowInstance.count({ where: { organisationId: ids.orgA } }),
    audits: await prisma.auditLog.count({ where: { organisationId: ids.orgA } }),
    activities: await prisma.leadActivity.count({ where: { actorOrganisationId: ids.orgA } })
  }, before);
});
