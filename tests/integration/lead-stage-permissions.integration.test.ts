import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { OrganisationContextError, resolveOrganisationContextForUser } from '../../lib/identity';
import { OrganisationRecordAccessError } from '../../lib/lead-access';
import { changeLeadPipelineStage } from '../../lib/lead-workflow';
import { AuthorizationError } from '../../lib/permissions';
import { WorkflowExecutionError } from '../../lib/workflow';

const prisma = new PrismaClient();
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);

const orgA = `org_perm_a_${suffix}`;
const orgB = `org_perm_b_${suffix}`;
const installerA = `installer_perm_a_${suffix}`;
const installerB = `installer_perm_b_${suffix}`;
const leadA = `lead_perm_a_${suffix}`;
const leadB = `lead_perm_b_${suffix}`;
const permittedUser = `user_permitted_${suffix}`;
const restrictedUser = `user_restricted_${suffix}`;
const crossOrgUser = `user_cross_${suffix}`;
const inactiveUser = `user_inactive_${suffix}`;
const inactiveMembershipUser = `user_inactive_membership_${suffix}`;

test.after(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

function leadData(input: {
  id: string;
  organisationId: string;
  installerId: string;
  fullName: string;
  email: string;
  mprn: string;
}) {
  return {
    creationOrigin: 'HOMEOWNER_INTAKE' as const,
    id: input.id,
    organisationId: input.organisationId,
    installerId: input.installerId,
    fullName: input.fullName,
    email: input.email,
    addressLine1: '1 Test Street',
    county: 'Dublin',
    propertyOwner: true,
    dwellingType: 'DETACHED' as const,
    yearBuilt: 2016,
    mprn: input.mprn,
    worksStarted: false,
    consentToProcess: true,
    consentToGrantAssist: true
  };
}

async function cleanupTestData() {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { resourceId: { in: [leadA, leadB] } },
        { leadId: { in: [leadA, leadB] } },
        { organisationId: { in: [orgA, orgB] } }
      ]
    }
  });
  await prisma.workflowHistory.deleteMany({
    where: {
      workflowInstance: {
        resourceType: 'lead',
        resourceId: {
          in: [leadA, leadB]
        }
      }
    }
  });
  await prisma.workflowInstance.deleteMany({
    where: {
      resourceType: 'lead',
      resourceId: {
        in: [leadA, leadB]
      }
    }
  });
  await prisma.leadActivity.deleteMany({
    where: {
      leadId: {
        in: [leadA, leadB]
      }
    }
  });
  await prisma.lead.deleteMany({
    where: {
      id: {
        in: [leadA, leadB]
      }
    }
  });
  await prisma.installer.deleteMany({
    where: {
      id: {
        in: [installerA, installerB]
      }
    }
  });
  await prisma.organisationMembership.deleteMany({
    where: {
      OR: [
        { organisationId: { in: [orgA, orgB] } },
        { userId: { in: [permittedUser, restrictedUser, crossOrgUser, inactiveUser, inactiveMembershipUser] } }
      ]
    }
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [permittedUser, restrictedUser, crossOrgUser, inactiveUser, inactiveMembershipUser]
      }
    }
  });
  await prisma.organisation.deleteMany({
    where: {
      id: {
        in: [orgA, orgB]
      }
    }
  });
}

async function seedTestData() {
  await cleanupTestData();

  await prisma.organisation.createMany({
    data: [
      { id: orgA, name: 'Permission Test A', slug: `permission-a-${suffix}`, type: 'INSTALLER' },
      { id: orgB, name: 'Permission Test B', slug: `permission-b-${suffix}`, type: 'INSTALLER' }
    ]
  });

  await prisma.installer.createMany({
    data: [
      {
        id: installerA,
        organisationId: orgA,
        name: 'Permission Installer A',
        slug: `permission-installer-a-${suffix}`,
        seaiCompanyId: `SEAI-PA-${suffix}`
      },
      {
        id: installerB,
        organisationId: orgB,
        name: 'Permission Installer B',
        slug: `permission-installer-b-${suffix}`,
        seaiCompanyId: `SEAI-PB-${suffix}`
      }
    ]
  });

  await prisma.user.createMany({
    data: [
      {
        id: permittedUser,
        email: `permitted-${suffix}@example.test`,
        displayName: 'Permitted User'
      },
      {
        id: restrictedUser,
        email: `restricted-${suffix}@example.test`,
        displayName: 'Restricted User'
      },
      {
        id: crossOrgUser,
        email: `cross-${suffix}@example.test`,
        displayName: 'Cross Org User'
      },
      {
        id: inactiveUser,
        email: `inactive-${suffix}@example.test`,
        displayName: 'Inactive User',
        status: 'INACTIVE'
      },
      {
        id: inactiveMembershipUser,
        email: `inactive-membership-${suffix}@example.test`,
        displayName: 'Inactive Membership User'
      }
    ]
  });

  await prisma.organisationMembership.createMany({
    data: [
      {
        id: `membership_permitted_${suffix}`,
        organisationId: orgA,
        userId: permittedUser,
        role: 'ORGANISATION_ADMIN'
      },
      {
        id: `membership_restricted_${suffix}`,
        organisationId: orgA,
        userId: restrictedUser,
        role: 'ORGANISATION_MEMBER'
      },
      {
        id: `membership_cross_${suffix}`,
        organisationId: orgB,
        userId: crossOrgUser,
        role: 'ORGANISATION_ADMIN'
      },
      {
        id: `membership_inactive_user_${suffix}`,
        organisationId: orgA,
        userId: inactiveUser,
        role: 'ORGANISATION_ADMIN'
      },
      {
        id: `membership_inactive_membership_${suffix}`,
        organisationId: orgA,
        userId: inactiveMembershipUser,
        status: 'INACTIVE',
        role: 'ORGANISATION_ADMIN'
      }
    ]
  });

  await prisma.lead.createMany({
    data: [
      leadData({
        id: leadA,
        organisationId: orgA,
        installerId: installerA,
        fullName: 'Permission Test Homeowner A',
        email: `homeowner-a-${suffix}@example.test`,
        mprn: '20000000001'
      }),
      leadData({
        id: leadB,
        organisationId: orgB,
        installerId: installerB,
        fullName: 'Permission Test Homeowner B',
        email: `homeowner-b-${suffix}@example.test`,
        mprn: '20000000002'
      })
    ]
  });
}

async function assertLeadStage(expectedStage: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadA },
    select: { pipelineStage: true }
  });
  assert.equal(lead.pipelineStage, expectedStage);
}

async function assertLeadWorkflowStage(expectedStage: string) {
  const workflowInstance = await prisma.workflowInstance.findFirstOrThrow({
    where: {
      resourceType: 'lead',
      resourceId: leadA
    },
    include: {
      currentStage: true
    }
  });

  assert.equal(workflowInstance.currentStage.key, expectedStage);
}

test('protected lead stage workflow enforces permissions, tenant ownership, and typed audit', async () => {
  await prisma.$connect();
  await seedTestData();

  const permittedContext = await resolveOrganisationContextForUser({
    userId: permittedUser,
    organisationId: orgA,
    db: prisma
  });

  await prisma.$transaction(async (tx) => {
    await changeLeadPipelineStage({
      db: tx,
      context: permittedContext,
      leadId: leadA,
      nextStage: 'CONTACTED'
    });
  });

  await assertLeadStage('CONTACTED');
  await assertLeadWorkflowStage('CONTACTED');

  const auditEvent = await prisma.auditLog.findFirstOrThrow({
    where: {
      action: 'lead.pipeline_stage_updated',
      resourceId: leadA
    },
    orderBy: { createdAt: 'desc' }
  });
  assert.equal(auditEvent.organisationId, orgA);
  assert.equal(auditEvent.actorType, 'HUMAN_USER');
  assert.equal(auditEvent.userId, permittedUser);
  assert.equal(auditEvent.membershipId, permittedContext.membershipId);
  assert.equal(auditEvent.resourceType, 'lead');
  assert.equal(auditEvent.outcome, 'SUCCEEDED');
  assert.equal(auditEvent.source, 'installer_dashboard');
  assert.equal((auditEvent.metadataJson as Record<string, unknown>).workflowDefinitionKey, 'solargrant.lead_pipeline');

  const workflowHistory = await prisma.workflowHistory.findFirstOrThrow({
    where: {
      workflowInstance: {
        resourceType: 'lead',
        resourceId: leadA
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  assert.equal(workflowHistory.previousStageKey, 'NEW_LEAD');
  assert.equal(workflowHistory.nextStageKey, 'CONTACTED');
  assert.equal(workflowHistory.organisationId, orgA);
  assert.equal(workflowHistory.actorType, 'HUMAN_USER');
  assert.equal(workflowHistory.actorUserId, permittedUser);
  assert.equal(workflowHistory.actorMembershipId, permittedContext.membershipId);
  assert.equal(workflowHistory.actorOrganisationId, orgA);
  assert.equal(workflowHistory.auditLogId, auditEvent.id);

  const activity = await prisma.leadActivity.findFirstOrThrow({
    where: {
      leadId: leadA,
      type: 'STAGE_CHANGED'
    },
    orderBy: { createdAt: 'desc' }
  });
  assert.equal(activity.actorType, 'HUMAN_USER');
  assert.equal(activity.actorUserId, permittedUser);
  assert.equal(activity.actorMembershipId, permittedContext.membershipId);
  assert.equal(activity.actorOrganisationId, orgA);

  await assert.rejects(
    prisma.$transaction((tx) =>
      changeLeadPipelineStage({
        db: tx,
        context: permittedContext,
        leadId: leadA,
        nextStage: 'NOT_A_STAGE'
      })
    ),
    (error) => error instanceof WorkflowExecutionError && error.code === 'WORKFLOW_STAGE_NOT_FOUND'
  );
  await assertLeadStage('CONTACTED');
  await assertLeadWorkflowStage('CONTACTED');

  const restrictedContext = await resolveOrganisationContextForUser({
    userId: restrictedUser,
    organisationId: orgA,
    db: prisma
  });

  await assert.rejects(
    prisma.$transaction((tx) =>
      changeLeadPipelineStage({
        db: tx,
        context: restrictedContext,
        leadId: leadA,
        nextStage: 'QUALIFIED'
      })
    ),
    (error) => error instanceof AuthorizationError && error.code === 'PERMISSION_DENIED'
  );
  await assertLeadStage('CONTACTED');
  await assertLeadWorkflowStage('CONTACTED');

  const crossOrgContext = await resolveOrganisationContextForUser({
    userId: crossOrgUser,
    organisationId: orgB,
    db: prisma
  });

  await assert.rejects(
    prisma.$transaction((tx) =>
      changeLeadPipelineStage({
        db: tx,
        context: crossOrgContext,
        leadId: leadA,
        nextStage: 'SURVEY_BOOKED'
      })
    ),
    (error) => error instanceof OrganisationRecordAccessError
  );
  await assertLeadStage('CONTACTED');
  await assertLeadWorkflowStage('CONTACTED');

  await assert.rejects(
    prisma.$transaction((tx) =>
      changeLeadPipelineStage({
        db: tx,
        context: null,
        leadId: leadA,
        nextStage: 'SURVEY_BOOKED'
      })
    ),
    (error) => error instanceof AuthorizationError && error.code === 'MISSING_CONTEXT'
  );
  await assertLeadStage('CONTACTED');
  await assertLeadWorkflowStage('CONTACTED');

  await assert.rejects(
    resolveOrganisationContextForUser({
      userId: inactiveUser,
      organisationId: orgA,
      db: prisma
    }),
    (error) => error instanceof OrganisationContextError && error.code === 'INACTIVE_USER'
  );

  await assert.rejects(
    resolveOrganisationContextForUser({
      userId: inactiveMembershipUser,
      organisationId: orgA,
      db: prisma
    }),
    (error) => error instanceof OrganisationContextError && error.code === 'INACTIVE_MEMBERSHIP'
  );

  const tamperedRestrictedContext = {
    ...restrictedContext,
    permissions: ['lead.change_status'],
    requestedOrganisationId: orgA
  };
  await assert.rejects(
    prisma.$transaction((tx) =>
      changeLeadPipelineStage({
        db: tx,
        context: tamperedRestrictedContext,
        leadId: leadA,
        nextStage: 'SURVEY_BOOKED'
      })
    ),
    (error) => error instanceof AuthorizationError && error.code === 'PERMISSION_DENIED'
  );
  await assertLeadStage('CONTACTED');
  await assertLeadWorkflowStage('CONTACTED');

  const successCount = await prisma.auditLog.count({
    where: {
      action: 'lead.pipeline_stage_updated',
      resourceId: leadA,
      outcome: 'SUCCEEDED'
    }
  });
  assert.equal(successCount, 1);

  const historyCount = await prisma.workflowHistory.count({
    where: {
      workflowInstance: {
        resourceType: 'lead',
        resourceId: leadA
      }
    }
  });
  assert.equal(historyCount, 1);

  await cleanupTestData();
});
