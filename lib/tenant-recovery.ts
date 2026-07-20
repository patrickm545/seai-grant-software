import { createHash } from 'node:crypto';
import type {
  Prisma,
  PrismaClient,
  ProvisioningOperationType,
  ProvisioningOperationStatus
} from '@prisma/client';
import { writeAuditEvent } from './audit';
import type { CredentialDeliveryAdapter, CredentialDeliveryReceipt } from './credential-delivery';
import { generateTemporaryCredential } from './tenant-provisioning';
import { hashPilotPassword } from './password-hashing';

type DbClient = PrismaClient | Prisma.TransactionClient;

const TEMPORARY_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1000;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_RECEIPT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export const RECOVERY_STATES = [
  'HEALTHY_ACTIVE',
  'INVITED_CREDENTIAL_VALID',
  'INVITED_CREDENTIAL_EXPIRED',
  'DELIVERY_FAILED',
  'PROVISIONING_INCOMPLETE',
  'USER_SUSPENDED',
  'ORGANISATION_SUSPENDED',
  'ACTIVATION_STATE_DRIFT',
  'MANUAL_REVIEW_REQUIRED'
] as const;
export type TenantRecoveryState = (typeof RECOVERY_STATES)[number];

export type RecoveryOperationType =
  | 'RECOVERY_CREDENTIAL_REISSUE'
  | 'RECOVERY_SUSPEND_USER'
  | 'RECOVERY_SUSPEND_ORGANISATION'
  | 'RECOVERY_REACTIVATE_USER'
  | 'RECOVERY_REACTIVATE_ORGANISATION';

export class TenantRecoveryError extends Error {
  constructor(
    public readonly code:
      | 'INPUT_INVALID'
      | 'APPROVER_NOT_AUTHORISED'
      | 'TARGET_NOT_FOUND'
      | 'RECOVERY_REFUSED'
      | 'IDEMPOTENCY_KEY_MISMATCH'
      | 'IDEMPOTENCY_OPERATION_INCOMPLETE'
      | 'DELIVERY_FAILED'
      | 'PRODUCTION_DISABLED'
      | 'TRANSACTION_FAILED',
    message: string
  ) {
    super(message);
    this.name = 'TenantRecoveryError';
  }
}

export type RecoveryInspection = {
  state: TenantRecoveryState;
  safe: true;
  organisation: { id: string; name: string; slug: string; status: string; type: string };
  installer: { id: string; name: string; slug: string } | null;
  owner: {
    id: string;
    displayName: string;
    email: string;
    status: string;
    membershipId: string;
    membershipStatus: string;
    role: string;
    isOwner: boolean;
  } | null;
  credential: { state: 'VALID' | 'EXPIRED' | 'NOT_USABLE' | 'NOT_APPLICABLE'; expiresAt: Date | null; mustChangePassword: boolean };
  sessions: { active: number; restricted: number; normal: number };
  provisioning: { id: string; status: ProvisioningOperationStatus; operationType: ProvisioningOperationType } | null;
  audit: { count: number; recentActions: string[] };
};

export type RecoveryInput = {
  organisationId: string;
  approverUserId: string;
  idempotencyKey: string;
  reason: string;
  environment: 'development' | 'test' | 'preview' | 'production';
};

export type RecoveryPlan = {
  safeToExecute: boolean;
  operationType: RecoveryOperationType;
  state: TenantRecoveryState;
  operationId: string | null;
  completedAt?: Date | null;
  idempotency: 'NEW' | 'COMPLETED_MATCH' | 'MISMATCH' | 'INCOMPLETE';
  intendedDatabaseActions: string[];
  refusalReason?: string;
  target: { organisationId: string; userId: string | null };
};

export type RecoveryResult = {
  idempotentReplay: boolean;
  operation: { id: string; operationType: RecoveryOperationType; status: ProvisioningOperationStatus; completedAt: Date | null };
  state: TenantRecoveryState;
  organisationId: string;
  userId: string | null;
  revokedSessionCount: number;
  delivery?: CredentialDeliveryReceipt;
};

type RecoveryTarget = {
  organisation: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    verified: boolean;
    installers: Array<{ id: string; name: string; slug: string }>;
    memberships: Array<{
      id: string;
      userId: string;
      status: string;
      isOwner: boolean;
      role: string;
      user: {
        id: string;
        email: string;
        displayName: string;
        status: string;
        mustChangePassword: boolean;
        passwordHash: string | null;
        temporaryCredentialExpiresAt: Date | null;
        sessions: Array<{ id: string; sessionType: string; expiresAt: Date; createdAt: Date }>;
      };
    }>;
    provisioningOperations: Array<{
      id: string;
      status: ProvisioningOperationStatus;
      operationType: ProvisioningOperationType;
      approvedBy: string | null;
      approvedAt: Date | null;
      completedAt: Date | null;
      createdAt: Date;
    }>;
    auditLogs: Array<{ action: string; outcome: string; createdAt: Date }>;
  };
};

async function loadRecoveryTarget(db: DbClient, organisationId: string): Promise<RecoveryTarget> {
  if (!SAFE_IDENTIFIER.test(organisationId)) throw new TenantRecoveryError('INPUT_INVALID', 'Organisation ID is invalid.');
  const organisation = await db.organisation.findUnique({
    where: { id: organisationId },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      status: true,
      verified: true,
      installers: { select: { id: true, name: true, slug: true } },
      memberships: {
        select: {
          id: true,
          userId: true,
          status: true,
          isOwner: true,
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              status: true,
              mustChangePassword: true,
              passwordHash: true,
              temporaryCredentialExpiresAt: true,
              sessions: { select: { id: true, sessionType: true, expiresAt: true, createdAt: true } }
            }
          }
        }
      },
      provisioningOperations: {
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: { id: true, status: true, operationType: true, approvedBy: true, approvedAt: true, completedAt: true, createdAt: true }
      },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 100, select: { action: true, outcome: true, createdAt: true } }
    }
  });
  if (!organisation) throw new TenantRecoveryError('TARGET_NOT_FOUND', 'The target organisation was not found.');
  return { organisation } as RecoveryTarget;
}

function ownerMembership(target: RecoveryTarget) {
  const owners = target.organisation.memberships.filter((membership) => membership.isOwner && membership.role === 'ORGANISATION_OWNER');
  return owners.length === 1 ? owners[0] : null;
}

function classifyRecovery(target: RecoveryTarget, now: Date): TenantRecoveryState {
  const org = target.organisation;
  if (org.type !== 'INSTALLER' || org.installers.length !== 1) return 'MANUAL_REVIEW_REQUIRED';
  if (org.status === 'INACTIVE') return 'ORGANISATION_SUSPENDED';
  const membership = ownerMembership(target);
  if (!membership) return 'MANUAL_REVIEW_REQUIRED';
  if (membership.status !== 'ACTIVE') return 'ACTIVATION_STATE_DRIFT';
  const user = membership.user;
  if (user.status === 'INACTIVE') return 'USER_SUSPENDED';
  const latest = org.provisioningOperations[0];
  if (org.status === 'PROVISIONING') {
    if (latest && latest.status === 'FAILED' && ['PROVISIONING', 'RECOVERY_CREDENTIAL_REISSUE'].includes(latest.operationType)) return 'DELIVERY_FAILED';
    if (user.status !== 'INVITED' || !user.mustChangePassword || !user.temporaryCredentialExpiresAt) return 'ACTIVATION_STATE_DRIFT';
    if (!user.passwordHash) return 'PROVISIONING_INCOMPLETE';
    if (user.temporaryCredentialExpiresAt <= now) return 'INVITED_CREDENTIAL_EXPIRED';
    if (latest && ['PENDING', 'VALIDATING', 'READY'].includes(latest.status)) return 'PROVISIONING_INCOMPLETE';
    return 'INVITED_CREDENTIAL_VALID';
  }
  if (org.status === 'ACTIVE' && user.status === 'ACTIVE' && !user.mustChangePassword && membership.status === 'ACTIVE') return 'HEALTHY_ACTIVE';
  return 'ACTIVATION_STATE_DRIFT';
}

export async function inspectTenantRecovery(args: { db: DbClient; organisationId: string; now?: Date } | { db: DbClient; input: { organisationId: string }; now?: Date }): Promise<RecoveryInspection> {
  const organisationId = 'input' in args ? args.input.organisationId : args.organisationId;
  const target = await loadRecoveryTarget(args.db, organisationId);
  const now = args.now ?? new Date();
  const membership = ownerMembership(target);
  const owner = membership?.user ?? null;
  const activeSessions = owner?.sessions.filter((session) => session.expiresAt > now) ?? [];
  const latest = target.organisation.provisioningOperations[0] ?? null;
  const credentialState = !owner || owner.status === 'ACTIVE'
    ? 'NOT_APPLICABLE'
    : owner.temporaryCredentialExpiresAt && owner.temporaryCredentialExpiresAt > now && owner.mustChangePassword
      ? 'VALID'
      : owner.mustChangePassword ? 'EXPIRED' : 'NOT_USABLE';
  return {
    safe: true,
    state: classifyRecovery(target, now),
    organisation: { id: target.organisation.id, name: target.organisation.name, slug: target.organisation.slug, status: target.organisation.status, type: target.organisation.type },
    installer: target.organisation.installers.length === 1 ? target.organisation.installers[0] : null,
    owner: membership && owner ? { id: owner.id, displayName: owner.displayName, email: owner.email, status: owner.status, membershipId: membership.id, membershipStatus: membership.status, role: membership.role, isOwner: membership.isOwner } : null,
    credential: { state: credentialState, expiresAt: owner?.temporaryCredentialExpiresAt ?? null, mustChangePassword: owner?.mustChangePassword ?? false },
    sessions: { active: activeSessions.length, restricted: activeSessions.filter((session) => session.sessionType === 'RESTRICTED_FIRST_LOGIN').length, normal: activeSessions.filter((session) => session.sessionType === 'NORMAL').length },
    provisioning: latest ? { id: latest.id, status: latest.status, operationType: latest.operationType } : null,
    audit: { count: target.organisation.auditLogs.length, recentActions: target.organisation.auditLogs.slice(0, 20).map((event) => event.action) }
  };
}

async function resolveApprover(db: DbClient, approverUserId: string, targetUserId?: string) {
  if (!SAFE_IDENTIFIER.test(approverUserId)) throw new TenantRecoveryError('INPUT_INVALID', 'Approver ID is invalid.');
  const approver = await db.user.findUnique({ where: { id: approverUserId }, select: { id: true, displayName: true, status: true, memberships: { select: { status: true, role: true, organisation: { select: { type: true, status: true } } } } } });
  const authorised = approver?.memberships.some(
    (membership) =>
      membership.status === 'ACTIVE' &&
      membership.organisation.type === 'CLADA_INTERNAL' &&
      membership.organisation.status === 'ACTIVE' &&
      ['CLADA_INTERNAL_ADMIN', 'CLADA_INTERNAL_SUPPORT'].includes(membership.role)
  );
  if (!approver || approver.status !== 'ACTIVE' || !authorised || approver.id === targetUserId) {
    throw new TenantRecoveryError('APPROVER_NOT_AUTHORISED', 'The approver is not an active Clada internal operator.');
  }
  return { id: approver.id, displayName: approver.displayName };
}

function validateRecoveryInput(input: RecoveryInput) {
  if (!SAFE_IDENTIFIER.test(input.organisationId) || !SAFE_IDENTIFIER.test(input.approverUserId) || !SAFE_IDENTIFIER.test(input.idempotencyKey)) throw new TenantRecoveryError('INPUT_INVALID', 'Recovery identifiers are invalid.');
  if (!input.reason || input.reason.trim().length < 3 || input.reason.length > 500 || CONTROL_CHARACTERS.test(input.reason)) throw new TenantRecoveryError('INPUT_INVALID', 'A bounded recovery reason is required.');
  if (!input.environment) throw new TenantRecoveryError('INPUT_INVALID', 'Recovery environment is required.');
  if (input.environment === 'production') throw new TenantRecoveryError('PRODUCTION_DISABLED', 'Production recovery execution remains disabled.');
}

function canonicalRecoveryInput(type: RecoveryOperationType, input: RecoveryInput, userId: string | null) {
  // The idempotency key identifies the operation record; it is deliberately
  // excluded from the canonical request digest so a new key can represent
  // the same reviewed request without changing its content hash.
  return JSON.stringify({ type, organisationId: input.organisationId, userId, approverUserId: input.approverUserId, reason: input.reason.trim() });
}

function recoveryInputHash(type: RecoveryOperationType, input: RecoveryInput, userId: string | null) {
  return createHash('sha256').update(canonicalRecoveryInput(type, input, userId)).digest('hex');
}

async function planRecoveryOperation(db: DbClient, type: RecoveryOperationType, input: RecoveryInput, now: Date): Promise<RecoveryPlan> {
  validateRecoveryInput(input);
  const target = await loadRecoveryTarget(db, input.organisationId);
  const membership = ownerMembership(target);
  const userId = membership?.userId ?? null;
  await resolveApprover(db, input.approverUserId, userId ?? undefined);
  const state = classifyRecovery(target, now);
  const hash = recoveryInputHash(type, input, userId);
  const operation = await db.provisioningOperation.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true, inputHash: true, status: true, operationType: true, completedAt: true } });
  if (operation && operation.inputHash !== hash) return { safeToExecute: false, operationType: type, state, operationId: operation.id, idempotency: 'MISMATCH', intendedDatabaseActions: [], refusalReason: 'Idempotency key is bound to different recovery input.', target: { organisationId: input.organisationId, userId } };
  if (operation && operation.operationType !== type) return { safeToExecute: false, operationType: type, state, operationId: operation.id, idempotency: 'MISMATCH', intendedDatabaseActions: [], refusalReason: 'Idempotency key is bound to a different operation type.', target: { organisationId: input.organisationId, userId } };
  if (operation?.status === 'COMPLETED') return { safeToExecute: true, operationType: type, state, operationId: operation.id, completedAt: operation.completedAt, idempotency: 'COMPLETED_MATCH', intendedDatabaseActions: [], target: { organisationId: input.organisationId, userId } };
  if (operation) return { safeToExecute: false, operationType: type, state, operationId: operation.id, idempotency: 'INCOMPLETE', intendedDatabaseActions: [], refusalReason: 'An incomplete recovery operation requires manual review.', target: { organisationId: input.organisationId, userId } };

  const allowed = type === 'RECOVERY_CREDENTIAL_REISSUE'
    ? ['INVITED_CREDENTIAL_EXPIRED', 'DELIVERY_FAILED', 'PROVISIONING_INCOMPLETE'].includes(state)
    : type === 'RECOVERY_SUSPEND_USER' ? ['HEALTHY_ACTIVE', 'INVITED_CREDENTIAL_VALID', 'INVITED_CREDENTIAL_EXPIRED', 'DELIVERY_FAILED', 'PROVISIONING_INCOMPLETE'].includes(state)
      : type === 'RECOVERY_SUSPEND_ORGANISATION' ? state !== 'MANUAL_REVIEW_REQUIRED'
        : type === 'RECOVERY_REACTIVATE_USER' ? state === 'USER_SUSPENDED'
          : state === 'ORGANISATION_SUSPENDED';
  if (!allowed || !membership) return { safeToExecute: false, operationType: type, state, operationId: null, idempotency: 'NEW', intendedDatabaseActions: [], refusalReason: 'Current lifecycle state is not an approved recovery transition.', target: { organisationId: input.organisationId, userId } };
  return { safeToExecute: true, operationType: type, state, operationId: null, idempotency: 'NEW', intendedDatabaseActions: ['create durable recovery operation', 'validate active internal approver', ...(type === 'RECOVERY_CREDENTIAL_REISSUE' ? ['replace credential hash and expiry', 'invalidate owner sessions', 'deliver through configured fake/test adapter'] : type === 'RECOVERY_SUSPEND_USER' ? ['set owner user INACTIVE', 'invalidate owner sessions'] : type === 'RECOVERY_SUSPEND_ORGANISATION' ? ['set organisation INACTIVE', 'invalidate all tenant sessions'] : ['restore approved lifecycle state', 'invalidate stale sessions']), 'write secret-free audit events'], target: { organisationId: input.organisationId, userId } };
}

export async function planTenantCredentialReissue(args: { db: DbClient; input: RecoveryInput; now?: Date }) { return planRecoveryOperation(args.db, 'RECOVERY_CREDENTIAL_REISSUE', args.input, args.now ?? new Date()); }
export async function planTenantUserSuspension(args: { db: DbClient; input: RecoveryInput; now?: Date }) { return planRecoveryOperation(args.db, 'RECOVERY_SUSPEND_USER', args.input, args.now ?? new Date()); }
export async function planTenantOrganisationSuspension(args: { db: DbClient; input: RecoveryInput; now?: Date }) { return planRecoveryOperation(args.db, 'RECOVERY_SUSPEND_ORGANISATION', args.input, args.now ?? new Date()); }
export async function planTenantUserReactivation(args: { db: DbClient; input: RecoveryInput; now?: Date }) { return planRecoveryOperation(args.db, 'RECOVERY_REACTIVATE_USER', args.input, args.now ?? new Date()); }
export async function planTenantOrganisationReactivation(args: { db: DbClient; input: RecoveryInput; now?: Date }) { return planRecoveryOperation(args.db, 'RECOVERY_REACTIVATE_ORGANISATION', args.input, args.now ?? new Date()); }

async function executeRecoveryOperation(args: { db: PrismaClient; type: RecoveryOperationType; input: RecoveryInput; now: Date; deliveryAdapter?: CredentialDeliveryAdapter; loginUrl?: string }): Promise<RecoveryResult> {
  const plan = await planRecoveryOperation(args.db, args.type, args.input, args.now);
  if (plan.idempotency === 'COMPLETED_MATCH' && plan.operationId) return { idempotentReplay: true, operation: { id: plan.operationId, operationType: args.type, status: 'COMPLETED', completedAt: plan.completedAt ?? null }, state: plan.state, organisationId: args.input.organisationId, userId: plan.target.userId, revokedSessionCount: 0 };
  if (!plan.safeToExecute) throw new TenantRecoveryError(plan.idempotency === 'MISMATCH' ? 'IDEMPOTENCY_KEY_MISMATCH' : plan.idempotency === 'INCOMPLETE' ? 'IDEMPOTENCY_OPERATION_INCOMPLETE' : 'RECOVERY_REFUSED', plan.refusalReason ?? 'Recovery operation refused.');
  const target = await loadRecoveryTarget(args.db, args.input.organisationId);
  const membership = ownerMembership(target);
  if (!membership) throw new TenantRecoveryError('RECOVERY_REFUSED', 'The target has no unambiguous owner membership.');
  const userId = membership.userId;
  const operationHash = recoveryInputHash(args.type, args.input, userId);
  const approver = await resolveApprover(args.db, args.input.approverUserId, userId);
  let operationId = '';
  let revokedSessionCount = 0;
  let credential: string | undefined;
  let expiresAt: Date | undefined;
  if (args.type === 'RECOVERY_CREDENTIAL_REISSUE') {
    if (!args.deliveryAdapter) throw new TenantRecoveryError('DELIVERY_FAILED', 'A configured fake/test delivery adapter is required.');
    credential = generateTemporaryCredential();
    const passwordHash = await hashPilotPassword(credential);
    expiresAt = new Date(args.now.getTime() + TEMPORARY_CREDENTIAL_TTL_MS);
    try {
      operationId = await args.db.$transaction(async (tx) => {
        const op = await tx.provisioningOperation.create({ data: { idempotencyKey: args.input.idempotencyKey, inputHash: operationHash, operationType: args.type, status: 'READY', approvedBy: approver.id, approvedAt: args.now, organisationId: args.input.organisationId } });
        const updated = await tx.user.updateMany({ where: { id: userId, status: 'INVITED', mustChangePassword: true }, data: { passwordHash, status: 'INVITED', mustChangePassword: true, temporaryCredentialExpiresAt: expiresAt } });
        if (updated.count !== 1) throw new TenantRecoveryError('RECOVERY_REFUSED', 'Owner state changed; obtain a fresh inspection.');
        const sessions = await tx.authSession.deleteMany({ where: { userId } });
        revokedSessionCount = sessions.count;
        const base = { actor: approver.displayName, actorType: 'HUMAN_USER' as const, userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: op.id, source: 'tenant-recovery' };
        await writeAuditEvent(tx, { ...base, action: 'CREDENTIAL_REISSUE_STARTED', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'OPERATOR_REISSUE' } });
        await writeAuditEvent(tx, { ...base, action: 'PREVIOUS_CREDENTIAL_REVOKED', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'OPERATOR_REISSUE' } });
        await writeAuditEvent(tx, { ...base, action: 'CREDENTIAL_RESET', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'OPERATOR_REISSUE_REQUESTED' } });
        await writeAuditEvent(tx, { ...base, action: 'SESSIONS_INVALIDATED', resourceType: 'auth_session', metadata: { revokedSessionCount } });
        return op.id;
      }, { isolationLevel: 'Serializable' });
    } catch (error) { credential = undefined; if (error instanceof TenantRecoveryError) throw error; throw new TenantRecoveryError('TRANSACTION_FAILED', 'Recovery transaction failed.'); }
    try {
      const receipt = await args.deliveryAdapter.deliverTemporaryCredential({ recipientEmail: membership.user.email, recipientName: membership.user.displayName, organisationName: target.organisation.name, loginUrl: args.loginUrl ?? '', temporaryCredential: credential, expiresAt, operationId });
      credential = undefined;
      if (!SAFE_RECEIPT_ID.test(receipt.providerDeliveryId) || !['ACCEPTED', 'DELIVERED'].includes(receipt.status)) {
        throw new Error('Credential delivery returned an invalid safe receipt.');
      }
      const safeReceipt = { providerDeliveryId: receipt.providerDeliveryId, status: receipt.status };
      await args.db.$transaction(async (tx) => {
        await tx.provisioningOperation.update({ where: { id: operationId }, data: { status: 'COMPLETED', completedAt: args.now } });
        await writeAuditEvent(tx, { actor: approver.displayName, actorType: 'HUMAN_USER', userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: operationId, source: 'tenant-recovery', action: 'CREDENTIAL_REISSUE_DELIVERED', resourceType: 'user', resourceId: userId, metadata: safeReceipt });
        await writeAuditEvent(tx, { actor: approver.displayName, actorType: 'HUMAN_USER', userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: operationId, source: 'tenant-recovery', action: 'TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED', resourceType: 'user', resourceId: userId, metadata: safeReceipt });
        await writeAuditEvent(tx, { actor: approver.displayName, actorType: 'HUMAN_USER', userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: operationId, source: 'tenant-recovery', action: 'RECOVERY_OPERATION_COMPLETED', resourceType: 'provisioning_operation', resourceId: operationId });
      });
      return { idempotentReplay: false, operation: { id: operationId, operationType: args.type, status: 'COMPLETED', completedAt: args.now }, state: plan.state, organisationId: args.input.organisationId, userId, revokedSessionCount, delivery: safeReceipt };
    } catch {
      credential = undefined;
      try {
        const revocationHash = await hashPilotPassword(generateTemporaryCredential());
        await args.db.$transaction(async (tx) => {
          await tx.user.update({ where: { id: userId }, data: { passwordHash: revocationHash, status: 'INVITED', mustChangePassword: true, temporaryCredentialExpiresAt: args.now } });
          await tx.provisioningOperation.update({ where: { id: operationId }, data: { status: 'FAILED', completedAt: null } });
          await writeAuditEvent(tx, { actor: approver.displayName, actorType: 'HUMAN_USER', userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: operationId, source: 'tenant-recovery', action: 'PREVIOUS_CREDENTIAL_REVOKED', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'DELIVERY_FAILED', accessRevoked: true } });
          await writeAuditEvent(tx, { actor: approver.displayName, actorType: 'HUMAN_USER', userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: operationId, source: 'tenant-recovery', action: 'CREDENTIAL_REISSUE_FAILED', outcome: 'FAILED', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'DELIVERY_FAILED' } });
          await writeAuditEvent(tx, { actor: approver.displayName, actorType: 'HUMAN_USER', userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: operationId, source: 'tenant-recovery', action: 'TEMPORARY_CREDENTIAL_DELIVERY_FAILED', outcome: 'FAILED', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'DELIVERY_FAILED', accessRevoked: true } });
          await writeAuditEvent(tx, { actor: approver.displayName, actorType: 'HUMAN_USER', userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: operationId, source: 'tenant-recovery', action: 'RECOVERY_OPERATION_FAILED', outcome: 'FAILED', resourceType: 'provisioning_operation', resourceId: operationId, metadata: { reasonCode: 'DELIVERY_FAILED' } });
        });
      } catch { /* recovery failure is surfaced without secrets */ }
      throw new TenantRecoveryError('DELIVERY_FAILED', 'Credential delivery failed; the credential was revoked safely.');
    }
  }

  try {
    const result = await args.db.$transaction(async (tx) => {
      const op = await tx.provisioningOperation.create({ data: { idempotencyKey: args.input.idempotencyKey, inputHash: operationHash, operationType: args.type, status: 'COMPLETED', approvedBy: approver.id, approvedAt: args.now, completedAt: args.now, organisationId: args.input.organisationId } });
      const base = { actor: approver.displayName, actorType: 'HUMAN_USER' as const, userId: approver.id, organisationId: args.input.organisationId, provisioningOperationId: op.id, source: 'tenant-recovery' };
      if (args.type === 'RECOVERY_SUSPEND_USER') {
        await tx.user.update({ where: { id: userId }, data: { status: 'INACTIVE' } });
        const sessions = await tx.authSession.deleteMany({ where: { userId } }); revokedSessionCount = sessions.count;
        await writeAuditEvent(tx, { ...base, action: 'USER_SUSPENDED', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'OPERATOR_SUSPENSION', revokedSessionCount } });
      } else if (args.type === 'RECOVERY_SUSPEND_ORGANISATION') {
        await tx.organisation.update({ where: { id: args.input.organisationId }, data: { status: 'INACTIVE' } });
        const sessions = await tx.authSession.deleteMany({ where: { user: { memberships: { some: { organisationId: args.input.organisationId } } } } }); revokedSessionCount = sessions.count;
        await writeAuditEvent(tx, { ...base, action: 'ORGANISATION_SUSPENDED', resourceType: 'organisation', resourceId: args.input.organisationId, metadata: { reasonCode: 'OPERATOR_SUSPENSION', revokedSessionCount } });
      } else if (args.type === 'RECOVERY_REACTIVATE_USER') {
        const org = await tx.organisation.findUnique({ where: { id: args.input.organisationId }, select: { status: true } });
        if (org?.status !== 'ACTIVE') throw new TenantRecoveryError('RECOVERY_REFUSED', 'Organisation must be active before reactivating its owner.');
        await tx.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
        const sessions = await tx.authSession.deleteMany({ where: { userId } }); revokedSessionCount = sessions.count;
        await writeAuditEvent(tx, { ...base, action: 'USER_REACTIVATED', resourceType: 'user', resourceId: userId, metadata: { reasonCode: 'OPERATOR_REACTIVATION', revokedSessionCount } });
      } else {
        const owner = await tx.user.findUnique({ where: { id: userId }, select: { status: true, mustChangePassword: true } });
        if (owner?.status !== 'ACTIVE' || owner.mustChangePassword) throw new TenantRecoveryError('RECOVERY_REFUSED', 'Owner must be active and fully activated before organisation reactivation.');
        await tx.organisation.update({ where: { id: args.input.organisationId }, data: { status: 'ACTIVE' } });
        const sessions = await tx.authSession.deleteMany({ where: { user: { memberships: { some: { organisationId: args.input.organisationId } } } } }); revokedSessionCount = sessions.count;
        await writeAuditEvent(tx, { ...base, action: 'ORGANISATION_REACTIVATED', resourceType: 'organisation', resourceId: args.input.organisationId, metadata: { reasonCode: 'OPERATOR_REACTIVATION', revokedSessionCount } });
      }
      await writeAuditEvent(tx, { ...base, action: 'RECOVERY_OPERATION_COMPLETED', resourceType: 'provisioning_operation', resourceId: op.id });
      return op;
    }, { isolationLevel: 'Serializable' });
    return { idempotentReplay: false, operation: { id: result.id, operationType: args.type, status: 'COMPLETED', completedAt: args.now }, state: plan.state, organisationId: args.input.organisationId, userId, revokedSessionCount };
  } catch (error) { if (error instanceof TenantRecoveryError) throw error; throw new TenantRecoveryError('TRANSACTION_FAILED', 'Recovery transaction failed.'); }
}

export async function executeTenantCredentialReissue(args: { db: PrismaClient; input: RecoveryInput; deliveryAdapter: CredentialDeliveryAdapter; loginUrl?: string; now?: Date }) { return executeRecoveryOperation({ ...args, type: 'RECOVERY_CREDENTIAL_REISSUE', now: args.now ?? new Date() }); }
export async function executeTenantUserSuspension(args: { db: PrismaClient; input: RecoveryInput; now?: Date }) { return executeRecoveryOperation({ ...args, type: 'RECOVERY_SUSPEND_USER', now: args.now ?? new Date() }); }
export async function executeTenantOrganisationSuspension(args: { db: PrismaClient; input: RecoveryInput; now?: Date }) { return executeRecoveryOperation({ ...args, type: 'RECOVERY_SUSPEND_ORGANISATION', now: args.now ?? new Date() }); }
export async function executeTenantUserReactivation(args: { db: PrismaClient; input: RecoveryInput; now?: Date }) { return executeRecoveryOperation({ ...args, type: 'RECOVERY_REACTIVATE_USER', now: args.now ?? new Date() }); }
export async function executeTenantOrganisationReactivation(args: { db: PrismaClient; input: RecoveryInput; now?: Date }) { return executeRecoveryOperation({ ...args, type: 'RECOVERY_REACTIVATE_ORGANISATION', now: args.now ?? new Date() }); }

type RecoveryCommandArgs = {
  db: PrismaClient;
  input: Omit<RecoveryInput, 'environment'> & { environment?: RecoveryInput['environment']; targetType?: 'user' | 'organisation'; loginUrl?: string };
  mode?: 'dry-run' | 'execute';
  deliveryAdapter?: CredentialDeliveryAdapter;
  now?: Date;
  environment?: string;
};

function commandInput(args: RecoveryCommandArgs): RecoveryInput {
  return { ...args.input, environment: args.input.environment ?? (args.environment as RecoveryInput['environment']) };
}

export async function inspectTenantRecoveryState(args: RecoveryCommandArgs) {
  return inspectTenantRecovery({ db: args.db, organisationId: args.input.organisationId, now: args.now });
}

export async function reissueTenantCredential(args: RecoveryCommandArgs) {
  const input = commandInput(args);
  if (args.mode !== 'execute') return planTenantCredentialReissue({ ...args, input });
  const deliveryAdapter = args.deliveryAdapter;
  if (!deliveryAdapter) throw new TenantRecoveryError('DELIVERY_FAILED', 'A configured fake/test delivery adapter is required.');
  return executeTenantCredentialReissue({ ...args, input, deliveryAdapter, loginUrl: args.input.loginUrl });
}

export async function suspendTenantUser(args: RecoveryCommandArgs) {
  const input = commandInput(args);
  if (args.mode !== 'execute') return planTenantUserSuspension({ ...args, input });
  return executeTenantUserSuspension({ ...args, input });
}

export async function suspendTenantOrganisation(args: RecoveryCommandArgs) {
  const input = commandInput(args);
  if (args.mode !== 'execute') return planTenantOrganisationSuspension({ ...args, input });
  return executeTenantOrganisationSuspension({ ...args, input });
}

export async function reactivateTenantRecovery(args: RecoveryCommandArgs) {
  const input = commandInput(args);
  const targetType = args.input.targetType ?? 'user';
  if (targetType === 'organisation') {
    if (args.mode !== 'execute') return planTenantOrganisationReactivation({ ...args, input });
    return executeTenantOrganisationReactivation({ ...args, input });
  }
  if (args.mode !== 'execute') return planTenantUserReactivation({ ...args, input });
  return executeTenantUserReactivation({ ...args, input });
}

export const inspectTenantRecoveryForOrganisation = inspectTenantRecovery;
export const reactivateTenantUser = executeTenantUserReactivation;
export const reactivateTenantOrganisation = executeTenantOrganisationReactivation;
