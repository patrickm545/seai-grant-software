import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { LeadPipelineStage, Prisma, PrismaClient } from '@prisma/client';
import { resolveOrganisationContextForUser, type OrganisationContext } from '../../lib/identity';
import { updateLeadInOrganisation } from '../../lib/lead-access';
import { LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY } from '../../lib/lead-workflow';
import {
  ensureWorkflowInstanceForResource,
  executeWorkflowTransition,
  WorkflowExecutionError
} from '../../lib/workflow';

const prisma = new PrismaClient();

test.after(async () => {
  await prisma.$disconnect();
});

function ids(label: string) {
  const suffix = `${label}-${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  return {
    suffix,
    orgA: `org_workflow_a_${suffix}`,
    orgB: `org_workflow_b_${suffix}`,
    installerA: `installer_workflow_a_${suffix}`,
    leadA: `lead_workflow_a_${suffix}`,
    userA: `user_workflow_a_${suffix}`,
    membershipA: `membership_workflow_a_${suffix}`,
    altDefinition: `workflow_def_integrity_alt_${suffix}`,
    altStageOne: `workflow_stage_integrity_alt_one_${suffix}`,
    altStageTwo: `workflow_stage_integrity_alt_two_${suffix}`,
    altTransition: `workflow_transition_integrity_alt_${suffix}`
  };
}

type FixtureIds = ReturnType<typeof ids>;

function isDatabaseConstraintError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2003' || error.code === 'P2010';
  }

  return error instanceof Error && /foreign key|constraint/i.test(error.message);
}

async function cleanup(fixture: FixtureIds) {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { resourceId: fixture.leadA },
        { leadId: fixture.leadA },
        { organisationId: { in: [fixture.orgA, fixture.orgB] } }
      ]
    }
  });

  await prisma.workflowHistory.deleteMany({
    where: {
      OR: [
        { workflowInstance: { resourceId: fixture.leadA } },
        { workflowDefinitionId: fixture.altDefinition },
        { organisationId: { in: [fixture.orgA, fixture.orgB] } }
      ]
    }
  });

  await prisma.workflowInstance.deleteMany({
    where: {
      OR: [
        { resourceId: fixture.leadA },
        { workflowDefinitionId: fixture.altDefinition }
      ]
    }
  });

  await prisma.workflowDefinition.deleteMany({
    where: {
      id: fixture.altDefinition
    }
  });

  await prisma.leadActivity.deleteMany({ where: { leadId: fixture.leadA } });
  await prisma.lead.deleteMany({ where: { id: fixture.leadA } });
  await prisma.installer.deleteMany({ where: { id: fixture.installerA } });
  await prisma.organisationMembership.deleteMany({
    where: {
      OR: [
        { organisationId: { in: [fixture.orgA, fixture.orgB] } },
        { userId: fixture.userA }
      ]
    }
  });
  await prisma.user.deleteMany({ where: { id: fixture.userA } });
  await prisma.organisation.deleteMany({ where: { id: { in: [fixture.orgA, fixture.orgB] } } });
}

async function seedFixture(fixture: FixtureIds) {
  await cleanup(fixture);

  await prisma.organisation.createMany({
    data: [
      { id: fixture.orgA, name: 'Workflow Integrity A', slug: `workflow-a-${fixture.suffix}`, type: 'INSTALLER' },
      { id: fixture.orgB, name: 'Workflow Integrity B', slug: `workflow-b-${fixture.suffix}`, type: 'INSTALLER' }
    ]
  });

  await prisma.installer.create({
    data: {
      id: fixture.installerA,
      organisationId: fixture.orgA,
      name: 'Workflow Integrity Installer',
      slug: `workflow-installer-${fixture.suffix}`,
      seaiCompanyId: `SEAI-WF-${fixture.suffix}`
    }
  });

  await prisma.user.create({
    data: {
      id: fixture.userA,
      email: `workflow-${fixture.suffix}@example.test`,
      displayName: 'Workflow Integrity User'
    }
  });

  await prisma.organisationMembership.create({
    data: {
      id: fixture.membershipA,
      organisationId: fixture.orgA,
      userId: fixture.userA,
      role: 'ORGANISATION_ADMIN'
    }
  });

  await prisma.lead.create({
    data: {
      id: fixture.leadA,
      organisationId: fixture.orgA,
      installerId: fixture.installerA,
      creationOrigin: 'HOMEOWNER_INTAKE',
      fullName: 'Workflow Integrity Homeowner',
      email: `homeowner-${fixture.suffix}@example.test`,
      addressLine1: '1 Integrity Street',
      county: 'Dublin',
      propertyOwner: true,
      dwellingType: 'DETACHED',
      yearBuilt: 2018,
      mprn: '20000000003',
      worksStarted: false,
      consentToProcess: true,
      consentToGrantAssist: true
    }
  });

  const context = await resolveOrganisationContextForUser({
    userId: fixture.userA,
    organisationId: fixture.orgA,
    db: prisma
  });

  const leadWorkflowDefinition = await prisma.workflowDefinition.findFirstOrThrow({
    where: {
      key: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
      isActive: true
    }
  });

  const [newLeadStage, contactedStage] = await Promise.all([
    prisma.workflowStage.findUniqueOrThrow({
      where: {
        workflowDefinitionId_key: {
          workflowDefinitionId: leadWorkflowDefinition.id,
          key: 'NEW_LEAD'
        }
      }
    }),
    prisma.workflowStage.findUniqueOrThrow({
      where: {
        workflowDefinitionId_key: {
          workflowDefinitionId: leadWorkflowDefinition.id,
          key: 'CONTACTED'
        }
      }
    })
  ]);

  const workflowInstance = await ensureWorkflowInstanceForResource({
    db: prisma,
    workflowDefinitionKey: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
    organisationId: fixture.orgA,
    resourceType: 'lead',
    resourceId: fixture.leadA,
    stageKey: 'NEW_LEAD',
    metadata: {
      source: 'workflow_integrity_test'
    }
  });

  return {
    context,
    leadWorkflowDefinition,
    newLeadStage,
    contactedStage,
    workflowInstance
  };
}

async function seedAlternativeWorkflow(fixture: FixtureIds) {
  await prisma.workflowDefinition.create({
    data: {
      id: fixture.altDefinition,
      key: `integrity.alt.${fixture.suffix}`,
      name: 'Integrity Alternative Workflow',
      version: 1
    }
  });

  await prisma.workflowStage.createMany({
    data: [
      {
        id: fixture.altStageOne,
        workflowDefinitionId: fixture.altDefinition,
        key: 'ALT_ONE',
        label: 'Alternative One',
        position: 10,
        isInitial: true
      },
      {
        id: fixture.altStageTwo,
        workflowDefinitionId: fixture.altDefinition,
        key: 'ALT_TWO',
        label: 'Alternative Two',
        position: 20
      }
    ]
  });

  await prisma.workflowTransition.create({
    data: {
      id: fixture.altTransition,
      workflowDefinitionId: fixture.altDefinition,
      fromStageId: fixture.altStageOne,
      toStageId: fixture.altStageTwo,
      key: 'alt_one_to_alt_two',
      requiredPermission: 'lead.change_status'
    }
  });
}

async function executeLeadTransitionForTest(args: {
  context: OrganisationContext;
  leadId: string;
  nextStage: LeadPipelineStage;
  source: string;
  delayAfterProjection?: boolean;
  failAfterProjection?: boolean;
  afterProjection?: () => void;
}) {
  return prisma.$transaction(async (tx) =>
    executeWorkflowTransition({
      tx,
      context: args.context,
      workflowDefinitionKey: LEAD_PIPELINE_WORKFLOW_DEFINITION_KEY,
      resourceType: 'lead',
      resourceId: args.leadId,
      nextStageKey: args.nextStage,
      fallbackPermission: 'lead.change_status',
      auditAction: 'lead.pipeline_stage_updated',
      auditLeadId: args.leadId,
      source: args.source,
      metadata: {
        leadId: args.leadId
      },
      onTransition: async ({ tx: transitionTx, previousStage, nextStage }) => {
        await updateLeadInOrganisation(transitionTx, args.context, args.leadId, {
          pipelineStage: nextStage.key as LeadPipelineStage
        });

        await transitionTx.leadActivity.create({
          data: {
            leadId: args.leadId,
            type: 'STAGE_CHANGED',
            title: 'Pipeline stage changed',
            description: `${previousStage.key} to ${nextStage.key}`,
            metadata: {
              previousStage: previousStage.key,
              nextStage: nextStage.key,
              source: args.source
            },
            createdBy: args.context.actor.displayName,
            createdByRole: args.context.role,
            actorType: 'HUMAN_USER',
            actorUserId: args.context.actor.actorType === 'human_user' ? args.context.actor.userId : null,
            actorMembershipId: args.context.membershipId,
            actorOrganisationId: args.context.organisationId
          }
        });

        if (args.failAfterProjection) {
          throw new Error('forced transition failure after projection write');
        }

        args.afterProjection?.();

        if (args.delayAfterProjection) {
          await transitionTx.$executeRaw`SELECT pg_sleep(0.35)`;
        }
      }
    })
  );
}

async function getLeadAndWorkflowStage(leadId: string) {
  const [lead, workflowInstance] = await Promise.all([
    prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: { pipelineStage: true }
    }),
    prisma.workflowInstance.findFirstOrThrow({
      where: {
        resourceType: 'lead',
        resourceId: leadId
      },
      include: { currentStage: true }
    })
  ]);

  return {
    leadStage: lead.pipelineStage,
    workflowStage: workflowInstance.currentStage.key,
    workflowInstanceId: workflowInstance.id
  };
}

test('database rejects cross-definition workflow transition, instance, and history references', async () => {
  const fixture = ids('refs');
  const seeded = await seedFixture(fixture);
  await seedAlternativeWorkflow(fixture);

  try {
    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "WorkflowTransition" (
          "id",
          "workflowDefinitionId",
          "fromStageId",
          "toStageId",
          "key",
          "requiredPermission",
          "updatedAt"
        )
        VALUES (
          ${`bad_transition_from_${fixture.suffix}`},
          ${seeded.leadWorkflowDefinition.id},
          ${fixture.altStageOne},
          ${seeded.contactedStage.id},
          'bad_from_stage_definition',
          'lead.change_status',
          CURRENT_TIMESTAMP
        )
      `,
      isDatabaseConstraintError
    );

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "WorkflowTransition" (
          "id",
          "workflowDefinitionId",
          "fromStageId",
          "toStageId",
          "key",
          "requiredPermission",
          "updatedAt"
        )
        VALUES (
          ${`bad_transition_to_${fixture.suffix}`},
          ${seeded.leadWorkflowDefinition.id},
          ${seeded.newLeadStage.id},
          ${fixture.altStageTwo},
          'bad_to_stage_definition',
          'lead.change_status',
          CURRENT_TIMESTAMP
        )
      `,
      isDatabaseConstraintError
    );

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "WorkflowInstance" (
          "id",
          "workflowDefinitionId",
          "currentStageId",
          "organisationId",
          "resourceType",
          "resourceId",
          "updatedAt"
        )
        VALUES (
          ${`bad_instance_${fixture.suffix}`},
          ${seeded.leadWorkflowDefinition.id},
          ${fixture.altStageOne},
          ${fixture.orgA},
          'lead',
          ${`bad-resource-${fixture.suffix}`},
          CURRENT_TIMESTAMP
        )
      `,
      isDatabaseConstraintError
    );

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "WorkflowHistory" (
          "id",
          "workflowInstanceId",
          "workflowDefinitionId",
          "previousStageKey",
          "nextStageKey",
          "organisationId"
        )
        VALUES (
          ${`bad_history_definition_${fixture.suffix}`},
          ${seeded.workflowInstance.id},
          ${fixture.altDefinition},
          'NEW_LEAD',
          'CONTACTED',
          ${fixture.orgA}
        )
      `,
      isDatabaseConstraintError
    );

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "WorkflowHistory" (
          "id",
          "workflowInstanceId",
          "workflowDefinitionId",
          "transitionId",
          "previousStageKey",
          "nextStageKey",
          "organisationId"
        )
        VALUES (
          ${`bad_history_transition_${fixture.suffix}`},
          ${seeded.workflowInstance.id},
          ${seeded.leadWorkflowDefinition.id},
          ${fixture.altTransition},
          'NEW_LEAD',
          'CONTACTED',
          ${fixture.orgA}
        )
      `,
      isDatabaseConstraintError
    );

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "WorkflowHistory" (
          "id",
          "workflowInstanceId",
          "workflowDefinitionId",
          "previousStageId",
          "nextStageId",
          "previousStageKey",
          "nextStageKey",
          "organisationId"
        )
        VALUES (
          ${`bad_history_stage_${fixture.suffix}`},
          ${seeded.workflowInstance.id},
          ${seeded.leadWorkflowDefinition.id},
          ${fixture.altStageOne},
          ${seeded.contactedStage.id},
          'NEW_LEAD',
          'CONTACTED',
          ${fixture.orgA}
        )
      `,
      isDatabaseConstraintError
    );

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "WorkflowHistory" (
          "id",
          "workflowInstanceId",
          "workflowDefinitionId",
          "previousStageKey",
          "nextStageKey",
          "organisationId"
        )
        VALUES (
          ${`bad_history_org_${fixture.suffix}`},
          ${seeded.workflowInstance.id},
          ${seeded.leadWorkflowDefinition.id},
          'NEW_LEAD',
          'CONTACTED',
          ${fixture.orgB}
        )
      `,
      isDatabaseConstraintError
    );
  } finally {
    await cleanup(fixture);
  }
});

test('competing transitions from the same original stage cannot both succeed', async () => {
  const fixture = ids('race');
  const seeded = await seedFixture(fixture);

  try {
    let releaseFirstTransition: (() => void) | undefined;
    const firstTransitionHasUpdatedProjection = new Promise<void>((resolve) => {
      releaseFirstTransition = resolve;
    });

    const first = executeLeadTransitionForTest({
      context: seeded.context,
      leadId: fixture.leadA,
      nextStage: 'CONTACTED',
      source: 'workflow_race_test',
      delayAfterProjection: true,
      afterProjection: () => releaseFirstTransition?.()
    }).then(() => 'CONTACTED' as const);

    await Promise.race([
      firstTransitionHasUpdatedProjection,
      first.then(() => {
        throw new Error('first transition finished before race checkpoint');
      })
    ]);

    const second = executeLeadTransitionForTest({
      context: seeded.context,
      leadId: fixture.leadA,
      nextStage: 'QUALIFIED',
      source: 'workflow_race_test'
    }).then(() => 'QUALIFIED' as const);

    const results = await Promise.allSettled([first, second]);
    const fulfilled = results.filter((result): result is PromiseFulfilledResult<'CONTACTED' | 'QUALIFIED'> => result.status === 'fulfilled');
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].reason instanceof WorkflowExecutionError);
    assert.equal(rejected[0].reason.code, 'WORKFLOW_TRANSITION_STALE');

    const finalState = await getLeadAndWorkflowStage(fixture.leadA);
    assert.equal(finalState.leadStage, fulfilled[0].value);
    assert.equal(finalState.workflowStage, fulfilled[0].value);

    const [historyCount, auditCount, activityCount] = await Promise.all([
      prisma.workflowHistory.count({
        where: {
          workflowInstanceId: finalState.workflowInstanceId,
          outcome: 'SUCCEEDED'
        }
      }),
      prisma.auditLog.count({
        where: {
          resourceId: fixture.leadA,
          action: 'lead.pipeline_stage_updated',
          source: 'workflow_race_test',
          outcome: 'SUCCEEDED'
        }
      }),
      prisma.leadActivity.count({
        where: {
          leadId: fixture.leadA,
          metadata: {
            path: ['source'],
            equals: 'workflow_race_test'
          }
        }
      })
    ]);

    assert.equal(historyCount, 1);
    assert.equal(auditCount, 1);
    assert.equal(activityCount, 1);
  } finally {
    await cleanup(fixture);
  }
});

test('transition transaction rolls back workflow, projection, history, audit, and activity on later failure', async () => {
  const fixture = ids('rollback');
  const seeded = await seedFixture(fixture);

  try {
    await assert.rejects(
      executeLeadTransitionForTest({
        context: seeded.context,
        leadId: fixture.leadA,
        nextStage: 'CONTACTED',
        source: 'workflow_rollback_test',
        failAfterProjection: true
      }),
      /forced transition failure/
    );

    const finalState = await getLeadAndWorkflowStage(fixture.leadA);
    assert.equal(finalState.leadStage, 'NEW_LEAD');
    assert.equal(finalState.workflowStage, 'NEW_LEAD');

    const [historyCount, auditCount, activityCount] = await Promise.all([
      prisma.workflowHistory.count({
        where: {
          workflowInstanceId: finalState.workflowInstanceId
        }
      }),
      prisma.auditLog.count({
        where: {
          resourceId: fixture.leadA,
          source: 'workflow_rollback_test'
        }
      }),
      prisma.leadActivity.count({
        where: {
          leadId: fixture.leadA,
          metadata: {
            path: ['source'],
            equals: 'workflow_rollback_test'
          }
        }
      })
    ]);

    assert.equal(historyCount, 0);
    assert.equal(auditCount, 0);
    assert.equal(activityCount, 0);
  } finally {
    await cleanup(fixture);
  }
});
