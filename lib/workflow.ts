import type {
  AuditActorType,
  Prisma,
  PrismaClient,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStage,
  WorkflowTransition
} from '@prisma/client';
import { writeAuditEvent } from './audit';
import type { OrganisationContext } from './identity';
import {
  AuthorizationError,
  isPlatformPermission,
  requirePermission,
  type PlatformPermission
} from './permissions';

type DbClient = PrismaClient | Prisma.TransactionClient;
type TransactionClient = Prisma.TransactionClient;
type MutableJsonObject = Record<string, Prisma.InputJsonValue | null>;

export type WorkflowDefinitionSpec = {
  key: string;
  stages: Array<{
    key: string;
    isInitial?: boolean;
  }>;
  transitions: Array<{
    fromStageKey: string;
    toStageKey: string;
    requiredPermission?: string | null;
  }>;
};

export type WorkflowDefinitionValidationErrorCode =
  | 'EMPTY_WORKFLOW'
  | 'DUPLICATE_STAGE'
  | 'INVALID_INITIAL_STAGE_COUNT'
  | 'TRANSITION_STAGE_NOT_FOUND'
  | 'SELF_TRANSITION'
  | 'UNKNOWN_PERMISSION';

export class WorkflowDefinitionValidationError extends Error {
  constructor(
    public readonly code: WorkflowDefinitionValidationErrorCode,
    message = 'Workflow definition is invalid.'
  ) {
    super(message);
    this.name = 'WorkflowDefinitionValidationError';
  }
}

export type WorkflowExecutionErrorCode =
  | 'WORKFLOW_DEFINITION_NOT_FOUND'
  | 'WORKFLOW_INSTANCE_NOT_FOUND'
  | 'WORKFLOW_STAGE_NOT_FOUND'
  | 'WORKFLOW_TRANSITION_NOT_ALLOWED'
  | 'WORKFLOW_PERMISSION_UNKNOWN'
  | 'WORKFLOW_TRANSITION_STALE';

export class WorkflowExecutionError extends Error {
  constructor(
    public readonly code: WorkflowExecutionErrorCode,
    message = 'Workflow transition could not be executed.'
  ) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}

type WorkflowInstanceWithContext = WorkflowInstance & {
  workflowDefinition: WorkflowDefinition;
  currentStage: WorkflowStage;
};

export type WorkflowTransitionHookArgs = {
  tx: TransactionClient;
  workflowInstance: WorkflowInstanceWithContext;
  previousStage: WorkflowStage;
  nextStage: WorkflowStage;
  transition: WorkflowTransition;
  metadata: MutableJsonObject;
  now: Date;
};

export function validateWorkflowDefinitionSpec(spec: WorkflowDefinitionSpec) {
  if (spec.stages.length === 0) {
    throw new WorkflowDefinitionValidationError('EMPTY_WORKFLOW');
  }

  const stageKeys = new Set<string>();
  for (const stage of spec.stages) {
    if (stageKeys.has(stage.key)) {
      throw new WorkflowDefinitionValidationError('DUPLICATE_STAGE');
    }
    stageKeys.add(stage.key);
  }

  const initialStageCount = spec.stages.filter((stage) => stage.isInitial).length;
  if (initialStageCount !== 1) {
    throw new WorkflowDefinitionValidationError('INVALID_INITIAL_STAGE_COUNT');
  }

  for (const transition of spec.transitions) {
    if (!stageKeys.has(transition.fromStageKey) || !stageKeys.has(transition.toStageKey)) {
      throw new WorkflowDefinitionValidationError('TRANSITION_STAGE_NOT_FOUND');
    }

    if (transition.fromStageKey === transition.toStageKey) {
      throw new WorkflowDefinitionValidationError('SELF_TRANSITION');
    }

    if (transition.requiredPermission && !isPlatformPermission(transition.requiredPermission)) {
      throw new WorkflowDefinitionValidationError('UNKNOWN_PERMISSION');
    }
  }
}

function requireOrganisationContext(context: OrganisationContext | null | undefined): asserts context is OrganisationContext {
  if (!context) {
    throw new AuthorizationError('MISSING_CONTEXT');
  }
}

function requireTransactionClient(tx: TransactionClient) {
  if ('$transaction' in (tx as Record<string, unknown>)) {
    throw new Error('executeWorkflowTransition requires a Prisma.TransactionClient from an active transaction.');
  }
}

function getAuditActorType(context: OrganisationContext): AuditActorType {
  if (context.actor.actorType === 'system') return 'SYSTEM';
  if (context.actor.actorType === 'service') return 'SERVICE';
  return 'HUMAN_USER';
}

function getActorUserId(context: OrganisationContext) {
  return context.actor.actorType === 'human_user' ? context.actor.userId : null;
}

function requireKnownPermission(context: OrganisationContext, permission: string | null | undefined) {
  if (!permission) return;

  if (!isPlatformPermission(permission)) {
    throw new WorkflowExecutionError('WORKFLOW_PERMISSION_UNKNOWN');
  }

  requirePermission(context, permission as PlatformPermission);
}

function buildTransitionMetadata(args: {
  metadata?: Prisma.InputJsonObject;
  workflowInstance: WorkflowInstanceWithContext;
  transition?: WorkflowTransition | null;
  previousStage: WorkflowStage;
  nextStage: WorkflowStage;
}): MutableJsonObject {
  const { metadata, workflowInstance, transition, previousStage, nextStage } = args;

  return {
    ...(metadata ? Object.fromEntries(Object.entries(metadata)) : {}),
    workflowDefinitionKey: workflowInstance.workflowDefinition.key,
    workflowDefinitionVersion: workflowInstance.workflowDefinition.version,
    workflowInstanceId: workflowInstance.id,
    workflowTransitionId: transition?.id ?? null,
    previousStage: previousStage.key,
    nextStage: nextStage.key
  } satisfies MutableJsonObject;
}

async function getActiveWorkflowDefinition(db: DbClient, key: string) {
  const definition = await db.workflowDefinition.findFirst({
    where: {
      key,
      isActive: true
    },
    orderBy: {
      version: 'desc'
    }
  });

  if (!definition) {
    throw new WorkflowExecutionError('WORKFLOW_DEFINITION_NOT_FOUND');
  }

  return definition;
}

export async function ensureWorkflowInstanceForResource(args: {
  db: DbClient;
  workflowDefinitionKey: string;
  organisationId: string;
  resourceType: string;
  resourceId: string;
  stageKey: string;
  metadata?: Prisma.InputJsonObject;
}) {
  const { db, workflowDefinitionKey, organisationId, resourceType, resourceId, stageKey, metadata } = args;
  const definition = await getActiveWorkflowDefinition(db, workflowDefinitionKey);
  const stage = await db.workflowStage.findFirst({
    where: {
      workflowDefinitionId: definition.id,
      key: stageKey
    }
  });

  if (!stage) {
    throw new WorkflowExecutionError('WORKFLOW_STAGE_NOT_FOUND');
  }

  const existingInstance = await db.workflowInstance.findUnique({
    where: {
      workflowDefinitionId_resourceType_resourceId: {
        workflowDefinitionId: definition.id,
        resourceType,
        resourceId
      }
    }
  });

  if (existingInstance) {
    if (existingInstance.organisationId !== organisationId) {
      throw new WorkflowExecutionError('WORKFLOW_INSTANCE_NOT_FOUND');
    }

    return existingInstance;
  }

  return db.workflowInstance.create({
    data: {
      workflowDefinitionId: definition.id,
      currentStageId: stage.id,
      organisationId,
      resourceType,
      resourceId,
      completedAt: stage.isTerminal ? new Date() : null,
      metadata: metadata ?? undefined
    }
  });
}

export async function executeWorkflowTransition(args: {
  tx: TransactionClient;
  context: OrganisationContext | null | undefined;
  workflowDefinitionKey: string;
  resourceType: string;
  resourceId: string;
  nextStageKey: string;
  fallbackPermission?: PlatformPermission;
  source?: string | null;
  auditAction?: string;
  auditLeadId?: string | null;
  metadata?: Prisma.InputJsonObject;
  onTransition?: (hookArgs: WorkflowTransitionHookArgs) => Promise<void>;
}) {
  const {
    tx,
    workflowDefinitionKey,
    resourceType,
    resourceId,
    nextStageKey,
    fallbackPermission,
    source,
    auditAction = 'workflow.transition_executed',
    auditLeadId,
    metadata,
    onTransition
  } = args;

  requireTransactionClient(tx);
  requireOrganisationContext(args.context);
  const context = args.context;

  const workflowInstance = await tx.workflowInstance.findFirst({
    where: {
      organisationId: context.organisationId,
      resourceType,
      resourceId,
      workflowDefinition: {
        key: workflowDefinitionKey,
        isActive: true
      }
    },
    include: {
      workflowDefinition: true,
      currentStage: true
    }
  });

  if (!workflowInstance) {
    throw new WorkflowExecutionError('WORKFLOW_INSTANCE_NOT_FOUND');
  }

  const nextStage = await tx.workflowStage.findFirst({
    where: {
      workflowDefinitionId: workflowInstance.workflowDefinitionId,
      key: nextStageKey
    }
  });

  if (!nextStage) {
    throw new WorkflowExecutionError('WORKFLOW_STAGE_NOT_FOUND');
  }

  const now = new Date();

  if (workflowInstance.currentStageId === nextStage.id) {
    requireKnownPermission(context, fallbackPermission);
    const noChangeMetadata = buildTransitionMetadata({
      metadata,
      workflowInstance,
      previousStage: workflowInstance.currentStage,
      nextStage
    });
    const auditLog = await writeAuditEvent(tx, {
      leadId: auditLeadId,
      context,
      action: auditAction,
      resourceType,
      resourceId,
      source,
      outcome: 'SUCCEEDED',
      metadata: {
        ...noChangeMetadata,
        changed: false
      }
    });

    return {
      changed: false,
      workflowInstance,
      previousStage: workflowInstance.currentStage,
      nextStage,
      transition: null,
      history: null,
      auditLog
    };
  }

  const transition = await tx.workflowTransition.findFirst({
    where: {
      workflowDefinitionId: workflowInstance.workflowDefinitionId,
      fromStageId: workflowInstance.currentStageId,
      toStageId: nextStage.id,
      isActive: true
    }
  });

  if (!transition) {
    throw new WorkflowExecutionError('WORKFLOW_TRANSITION_NOT_ALLOWED');
  }

  requireKnownPermission(context, transition.requiredPermission ?? fallbackPermission);

  const transitionMetadata = buildTransitionMetadata({
    metadata,
    workflowInstance,
    transition,
    previousStage: workflowInstance.currentStage,
    nextStage
  });

  const updateResult = await tx.workflowInstance.updateMany({
    where: {
      id: workflowInstance.id,
      workflowDefinitionId: workflowInstance.workflowDefinitionId,
      organisationId: context.organisationId,
      currentStageId: workflowInstance.currentStageId
    },
    data: {
      currentStageId: nextStage.id,
      completedAt: nextStage.isTerminal ? now : null
    }
  });

  if (updateResult.count !== 1) {
    throw new WorkflowExecutionError('WORKFLOW_TRANSITION_STALE');
  }

  await onTransition?.({
    tx,
    workflowInstance,
    previousStage: workflowInstance.currentStage,
    nextStage,
    transition,
    metadata: transitionMetadata,
    now
  });

  const updatedInstance = await tx.workflowInstance.findUniqueOrThrow({
    where: {
      id: workflowInstance.id
    },
    include: {
      workflowDefinition: true,
      currentStage: true
    }
  });

  const auditLog = await writeAuditEvent(tx, {
    leadId: auditLeadId,
    context,
    action: auditAction,
    resourceType,
    resourceId,
    source,
    outcome: 'SUCCEEDED',
    metadata: {
      ...transitionMetadata,
      changed: true
    }
  });

  const history = await tx.workflowHistory.create({
    data: {
      workflowInstanceId: workflowInstance.id,
      workflowDefinitionId: workflowInstance.workflowDefinitionId,
      transitionId: transition.id,
      previousStageId: workflowInstance.currentStageId,
      nextStageId: nextStage.id,
      previousStageKey: workflowInstance.currentStage.key,
      nextStageKey: nextStage.key,
      organisationId: context.organisationId,
      actorType: getAuditActorType(context),
      actorUserId: getActorUserId(context),
      actorMembershipId: context.membershipId,
      actorOrganisationId: context.organisationId,
      outcome: 'SUCCEEDED',
      metadata: transitionMetadata,
      auditLogId: auditLog.id
    }
  });

  return {
    changed: true,
    workflowInstance: updatedInstance,
    previousStage: workflowInstance.currentStage,
    nextStage,
    transition,
    history,
    auditLog
  };
}
