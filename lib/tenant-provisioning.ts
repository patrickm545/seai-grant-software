import { createHash, randomBytes } from 'node:crypto';
import type { Prisma, PrismaClient, ProvisioningOperationStatus } from '@prisma/client';
import { z } from 'zod';
import { writeAuditEvent } from './audit';
import type {
  CredentialDeliveryAdapter,
  CredentialDeliveryReceipt
} from './credential-delivery';
import { hashPilotPassword } from './password-hashing';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_RECEIPT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const TEMPORARY_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1000;

const boundedText = (label: string, maximum: number) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(maximum, `${label} is too long.`)
    .refine((value) => !CONTROL_CHARACTERS.test(value), `${label} contains unsafe characters.`);

const optionalText = (label: string, maximum: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    boundedText(label, maximum).optional()
  );

export const tenantProvisioningInputSchema = z
  .object({
    organisationName: boundedText('Organisation name', 160),
    organisationSlug: boundedText('Organisation slug', 64).refine(
      (value) => KEBAB_CASE.test(value),
      'Organisation slug must be lowercase kebab-case.'
    ),
    installerName: boundedText('Installer name', 160),
    installerSlug: boundedText('Installer slug', 64).refine(
      (value) => KEBAB_CASE.test(value),
      'Installer slug must be lowercase kebab-case.'
    ),
    seaiCompanyId: boundedText('SEAI company ID', 80),
    websiteDomain: optionalText('Website domain', 253).transform((value) => value?.toLowerCase()),
    county: optionalText('County', 80),
    ownerDisplayName: boundedText('Owner display name', 160),
    ownerEmail: boundedText('Owner email', 254)
      .transform((value) => value.toLowerCase())
      .pipe(z.string().email('Owner email must be valid.')),
    approverUserId: boundedText('Approver user ID', 128).refine(
      (value) => SAFE_IDENTIFIER.test(value),
      'Approver user ID is invalid.'
    ),
    idempotencyKey: boundedText('Idempotency key', 128).refine(
      (value) => SAFE_IDENTIFIER.test(value),
      'Idempotency key is invalid.'
    ),
    environment: z.enum(['development', 'preview', 'test', 'production'])
  })
  .strict()
  .superRefine((input, context) => {
    if (input.websiteDomain) {
      try {
        const parsed = new URL(`https://${input.websiteDomain}`);
        if (
          parsed.hostname !== input.websiteDomain ||
          !input.websiteDomain.includes('.') ||
          parsed.username ||
          parsed.password ||
          parsed.port ||
          parsed.pathname !== '/'
        ) {
          throw new Error('invalid');
        }
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['websiteDomain'],
          message: 'Website domain must be a hostname without a protocol, path, port, or credentials.'
        });
      }
    }
  });

export type TenantProvisioningInput = z.input<typeof tenantProvisioningInputSchema>;
export type CanonicalTenantProvisioningInput = z.output<typeof tenantProvisioningInputSchema>;

export type ProvisioningConflictCode =
  | 'IDEMPOTENCY_KEY_MISMATCH'
  | 'IDEMPOTENCY_OPERATION_INCOMPLETE'
  | 'ORGANISATION_SLUG_CONFLICT'
  | 'ORGANISATION_NAME_CONFLICT'
  | 'INSTALLER_SLUG_CONFLICT'
  | 'SEAI_COMPANY_ID_CONFLICT'
  | 'OWNER_EMAIL_CONFLICT';

export type ProvisioningConflict = {
  code: ProvisioningConflictCode;
  message: string;
};

export type SafeApproverIdentity = {
  id: string;
  displayName: string;
  email: string;
};

export type TenantProvisioningPlan = {
  safeToExecute: boolean;
  inputHash: string;
  organisation: { name: string; slug: string; type: 'INSTALLER' };
  installer: {
    name: string;
    slug: string;
    seaiCompanyId: string;
    websiteDomain: string | null;
    county: string | null;
  };
  owner: { displayName: string; email: string; role: 'ORGANISATION_OWNER' };
  approver: SafeApproverIdentity;
  conflicts: ProvisioningConflict[];
  idempotency: {
    key: string;
    result: 'NEW' | 'COMPLETED_MATCH' | 'MISMATCH' | 'INCOMPLETE';
    operationId: string | null;
  };
  intendedDatabaseActions: string[];
};

export type TenantProvisioningResult = {
  idempotentReplay: boolean;
  operation: { id: string; status: ProvisioningOperationStatus; completedAt: Date | null };
  organisation: { id: string; name: string; slug: string; status: 'PROVISIONING' };
  installer: { id: string; name: string; slug: string };
  owner: {
    id: string;
    displayName: string;
    email: string;
    status: 'INVITED';
    mustChangePassword: true;
    temporaryCredentialExpiresAt: Date;
  };
  membership: { id: string; role: 'ORGANISATION_OWNER'; isOwner: true; status: 'ACTIVE' };
  delivery: CredentialDeliveryReceipt;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export type TenantProvisioningErrorCode =
  | 'INPUT_INVALID'
  | 'APPROVER_NOT_AUTHORISED'
  | 'PROVISIONING_CONFLICT'
  | 'DELIVERY_NOT_CONFIGURED'
  | 'TRANSACTION_FAILED'
  | 'DELIVERY_FAILED';

export class TenantProvisioningError extends Error {
  constructor(
    public readonly code: TenantProvisioningErrorCode,
    message: string,
    public readonly details?: { issues?: Array<{ path: string; message: string }>; conflicts?: ProvisioningConflict[] }
  ) {
    super(message);
    this.name = 'TenantProvisioningError';
  }
}

export function validateTenantProvisioningInput(
  input: TenantProvisioningInput
): CanonicalTenantProvisioningInput {
  const parsed = tenantProvisioningInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new TenantProvisioningError('INPUT_INVALID', 'Provisioning input validation failed.', {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'input',
        message: issue.message
      }))
    });
  }
  return parsed.data;
}

export function canonicalTenantProvisioningInput(input: CanonicalTenantProvisioningInput) {
  return JSON.stringify({
    environment: input.environment,
    organisationName: input.organisationName,
    organisationSlug: input.organisationSlug,
    installerName: input.installerName,
    installerSlug: input.installerSlug,
    seaiCompanyId: input.seaiCompanyId,
    websiteDomain: input.websiteDomain ?? null,
    county: input.county ?? null,
    ownerDisplayName: input.ownerDisplayName,
    ownerEmail: input.ownerEmail,
    approverUserId: input.approverUserId
  });
}

export function hashTenantProvisioningInput(input: CanonicalTenantProvisioningInput) {
  return createHash('sha256').update(canonicalTenantProvisioningInput(input)).digest('hex');
}

export function generateTemporaryCredential() {
  return randomBytes(32).toString('base64url');
}

async function resolveApprover(
  db: DbClient,
  approverUserId: string,
  requireActiveInternal = true
): Promise<SafeApproverIdentity> {
  const approver = await db.user.findUnique({
    where: { id: approverUserId },
    include: {
      memberships: {
        include: { organisation: true }
      }
    }
  });
  const activeInternalMembership = approver?.memberships.some(
    (membership) =>
      membership.status === 'ACTIVE' &&
      membership.organisation.type === 'CLADA_INTERNAL' &&
      membership.organisation.status === 'ACTIVE' &&
      ['CLADA_INTERNAL_ADMIN', 'CLADA_INTERNAL_SUPPORT'].includes(membership.role)
  );
  if (!approver || (requireActiveInternal && (approver.status !== 'ACTIVE' || !activeInternalMembership))) {
    throw new TenantProvisioningError(
      'APPROVER_NOT_AUTHORISED',
      'The durable approver identity is missing, inactive, or not an active Clada internal user.'
    );
  }
  return { id: approver.id, displayName: approver.displayName, email: approver.email };
}

function conflict(code: ProvisioningConflictCode, message: string): ProvisioningConflict {
  return { code, message };
}

export async function planTenantProvisioning(
  db: DbClient,
  rawInput: TenantProvisioningInput
): Promise<TenantProvisioningPlan> {
  const input = validateTenantProvisioningInput(rawInput);
  const inputHash = hashTenantProvisioningInput(input);
  const operation = await db.provisioningOperation.findUnique({
    where: { idempotencyKey: input.idempotencyKey }
  });
  const exactCompletedReplay = operation?.inputHash === inputHash && operation.status === 'COMPLETED';
  const [approver, organisationBySlug, organisationByName, installerBySlug, installerBySeaiId, owner] =
    await Promise.all([
      resolveApprover(db, input.approverUserId, !operation),
      db.organisation.findUnique({ where: { slug: input.organisationSlug } }),
      db.organisation.findFirst({ where: { name: { equals: input.organisationName, mode: 'insensitive' } } }),
      db.installer.findUnique({ where: { slug: input.installerSlug } }),
      db.installer.findFirst({ where: { seaiCompanyId: input.seaiCompanyId } }),
      db.user.findUnique({ where: { email: input.ownerEmail }, include: { memberships: true } })
    ]);

  const conflicts: ProvisioningConflict[] = [];
  let idempotencyResult: TenantProvisioningPlan['idempotency']['result'] = 'NEW';
  if (operation) {
    if (operation.inputHash !== inputHash) {
      idempotencyResult = 'MISMATCH';
      conflicts.push(
        conflict('IDEMPOTENCY_KEY_MISMATCH', 'The idempotency key is already bound to different canonical input.')
      );
    } else if (operation.status === 'COMPLETED') {
      idempotencyResult = 'COMPLETED_MATCH';
    } else {
      idempotencyResult = 'INCOMPLETE';
      conflicts.push(
        conflict(
          'IDEMPOTENCY_OPERATION_INCOMPLETE',
          'The matching operation is incomplete and requires reviewed recovery.'
        )
      );
    }
  }

  if (!exactCompletedReplay) {
    if (organisationBySlug) {
      conflicts.push(conflict('ORGANISATION_SLUG_CONFLICT', 'The organisation slug is already in use.'));
    } else if (organisationByName) {
      conflicts.push(conflict('ORGANISATION_NAME_CONFLICT', 'The organisation name is already in use.'));
    }
    if (installerBySlug) {
      conflicts.push(conflict('INSTALLER_SLUG_CONFLICT', 'The installer slug is already in use.'));
    } else if (installerBySeaiId) {
      conflicts.push(conflict('SEAI_COMPANY_ID_CONFLICT', 'The SEAI company ID is already in use.'));
    }
    if (owner) {
      conflicts.push(conflict('OWNER_EMAIL_CONFLICT', 'The owner email already belongs to an existing user.'));
    }
  } else {
    const membership = owner?.memberships.find(
      (candidate) => candidate.organisationId === operation.organisationId
    );
    const exactStoredResult =
      organisationBySlug?.id === operation.organisationId &&
      organisationBySlug.name === input.organisationName &&
      organisationBySlug.type === 'INSTALLER' &&
      organisationBySlug.status === 'PROVISIONING' &&
      installerBySlug?.organisationId === operation.organisationId &&
      installerBySlug.name === input.installerName &&
      installerBySlug.seaiCompanyId === input.seaiCompanyId &&
      installerBySlug.websiteDomain === (input.websiteDomain ?? null) &&
      installerBySlug.county === (input.county ?? null) &&
      owner?.displayName === input.ownerDisplayName &&
      owner.status === 'INVITED' &&
      owner.mustChangePassword === true &&
      Boolean(owner.temporaryCredentialExpiresAt) &&
      membership?.status === 'ACTIVE' &&
      membership.role === 'ORGANISATION_OWNER' &&
      membership.isOwner === true;
    if (!exactStoredResult) {
      conflicts.push(
        conflict(
          'IDEMPOTENCY_OPERATION_INCOMPLETE',
          'The completed operation no longer matches its required tenant result state.'
        )
      );
    }
  }

  return {
    safeToExecute: conflicts.length === 0,
    inputHash,
    organisation: { name: input.organisationName, slug: input.organisationSlug, type: 'INSTALLER' },
    installer: {
      name: input.installerName,
      slug: input.installerSlug,
      seaiCompanyId: input.seaiCompanyId,
      websiteDomain: input.websiteDomain ?? null,
      county: input.county ?? null
    },
    owner: {
      displayName: input.ownerDisplayName,
      email: input.ownerEmail,
      role: 'ORGANISATION_OWNER'
    },
    approver,
    conflicts,
    idempotency: {
      key: input.idempotencyKey,
      result: idempotencyResult,
      operationId: operation?.id ?? null
    },
    intendedDatabaseActions: exactCompletedReplay
      ? []
      : [
          'create provisioning operation',
          'create provisioning organisation',
          'create installer tenant',
          'create invited owner user with temporary credential hash',
          'create active owner membership',
          'write provisioning audit events',
          'deliver temporary credential through configured adapter',
          'record safe delivery receipt and complete operation'
        ]
  };
}

function validateReceipt(receipt: CredentialDeliveryReceipt) {
  if (!SAFE_RECEIPT_ID.test(receipt.providerDeliveryId) || !['ACCEPTED', 'DELIVERED'].includes(receipt.status)) {
    throw new TenantProvisioningError('DELIVERY_FAILED', 'Credential delivery returned an invalid safe receipt.');
  }
  return receipt;
}

async function readCompletedResult(
  db: DbClient,
  operationId: string,
  input: CanonicalTenantProvisioningInput
): Promise<TenantProvisioningResult> {
  const operation = await db.provisioningOperation.findUnique({
    where: { id: operationId },
    include: {
      organisation: { include: { installers: true, memberships: { include: { user: true } } } },
      auditLogs: { where: { action: 'TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED' }, orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });
  const organisation = operation?.organisation;
  const installer = organisation?.installers.find((candidate) => candidate.slug === input.installerSlug);
  const membership = organisation?.memberships.find((candidate) => candidate.user.email === input.ownerEmail);
  const owner = membership?.user;
  const receiptMetadata = operation?.auditLogs[0]?.metadataJson as Record<string, unknown> | null | undefined;
  if (
    !operation ||
    operation.status !== 'COMPLETED' ||
    !operation.completedAt ||
    !organisation ||
    organisation.status !== 'PROVISIONING' ||
    organisation.slug !== input.organisationSlug ||
    organisation.name !== input.organisationName ||
    !installer ||
    installer.name !== input.installerName ||
    installer.seaiCompanyId !== input.seaiCompanyId ||
    installer.websiteDomain !== (input.websiteDomain ?? null) ||
    installer.county !== (input.county ?? null) ||
    !membership ||
    membership.role !== 'ORGANISATION_OWNER' ||
    !membership.isOwner ||
    membership.status !== 'ACTIVE' ||
    !owner ||
    owner.status !== 'INVITED' ||
    owner.displayName !== input.ownerDisplayName ||
    !owner.mustChangePassword ||
    !owner.temporaryCredentialExpiresAt ||
    typeof receiptMetadata?.providerDeliveryId !== 'string' ||
    !SAFE_RECEIPT_ID.test(receiptMetadata.providerDeliveryId) ||
    !['ACCEPTED', 'DELIVERED'].includes(String(receiptMetadata.status))
  ) {
    throw new TenantProvisioningError(
      'PROVISIONING_CONFLICT',
      'The completed operation does not match the required safe result state.'
    );
  }
  return {
    idempotentReplay: true,
    operation: { id: operation.id, status: operation.status, completedAt: operation.completedAt },
    organisation: {
      id: organisation.id,
      name: organisation.name,
      slug: organisation.slug,
      status: 'PROVISIONING'
    },
    installer: { id: installer.id, name: installer.name, slug: installer.slug },
    owner: {
      id: owner.id,
      displayName: owner.displayName,
      email: owner.email,
      status: 'INVITED',
      mustChangePassword: true,
      temporaryCredentialExpiresAt: owner.temporaryCredentialExpiresAt
    },
    membership: {
      id: membership.id,
      role: 'ORGANISATION_OWNER',
      isOwner: true,
      status: 'ACTIVE'
    },
    delivery: {
      providerDeliveryId: receiptMetadata.providerDeliveryId,
      status: String(receiptMetadata.status) as CredentialDeliveryReceipt['status']
    }
  };
}

async function recordDeliveryFailure(
  db: PrismaClient,
  records: { operationId: string; organisationId: string; userId: string; approver: SafeApproverIdentity },
  failedAt: Date
) {
  let revocationCredential: string | undefined = generateTemporaryCredential();
  const revokedPasswordHash = await hashPilotPassword(revocationCredential);
  revocationCredential = undefined;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: records.userId },
      data: { passwordHash: revokedPasswordHash, temporaryCredentialExpiresAt: failedAt }
    });
    await tx.provisioningOperation.update({
      where: { id: records.operationId },
      data: { status: 'FAILED', completedAt: null }
    });
    await writeAuditEvent(tx, {
      action: 'TEMPORARY_CREDENTIAL_DELIVERY_FAILED',
      actor: records.approver.displayName,
      actorType: 'HUMAN_USER',
      userId: records.approver.id,
      organisationId: records.organisationId,
      provisioningOperationId: records.operationId,
      resourceType: 'user',
      resourceId: records.userId,
      source: 'tenant-provisioning-service',
      outcome: 'FAILED',
      metadata: { reasonCode: 'DELIVERY_FAILED', accessRevoked: true }
    });
    await writeAuditEvent(tx, {
      action: 'PROVISIONING_FAILED',
      actor: records.approver.displayName,
      actorType: 'HUMAN_USER',
      userId: records.approver.id,
      organisationId: records.organisationId,
      provisioningOperationId: records.operationId,
      resourceType: 'provisioning_operation',
      resourceId: records.operationId,
      source: 'tenant-provisioning-service',
      outcome: 'FAILED',
      metadata: { reasonCode: 'DELIVERY_FAILED', recoveryRequired: true }
    });
  });
}

export async function executeTenantProvisioning(args: {
  db: PrismaClient;
  input: TenantProvisioningInput;
  deliveryAdapter?: CredentialDeliveryAdapter;
  now?: Date;
  loginUrl: string;
}): Promise<TenantProvisioningResult> {
  const input = validateTenantProvisioningInput(args.input);
  const plan = await planTenantProvisioning(args.db, input);
  if (!plan.safeToExecute) {
    throw new TenantProvisioningError('PROVISIONING_CONFLICT', 'Provisioning conflicts require operator review.', {
      conflicts: plan.conflicts
    });
  }
  if (plan.idempotency.result === 'COMPLETED_MATCH' && plan.idempotency.operationId) {
    return readCompletedResult(args.db, plan.idempotency.operationId, input);
  }
  if (!args.deliveryAdapter) {
    throw new TenantProvisioningError(
      'DELIVERY_NOT_CONFIGURED',
      'Execution requires an explicitly configured credential delivery adapter.'
    );
  }

  const now = args.now ?? new Date();
  const temporaryCredentialExpiresAt = new Date(now.getTime() + TEMPORARY_CREDENTIAL_TTL_MS);
  let temporaryCredential: string | undefined = generateTemporaryCredential();
  const passwordHash = await hashPilotPassword(temporaryCredential);
  let records:
    | {
        operationId: string;
        organisationId: string;
        installerId: string;
        userId: string;
        membershipId: string;
        approver: SafeApproverIdentity;
      }
    | undefined;

  try {
    records = await args.db.$transaction(
      async (tx) => {
        const transactionPlan = await planTenantProvisioning(tx, input);
        if (!transactionPlan.safeToExecute || transactionPlan.idempotency.result !== 'NEW') {
          throw new TenantProvisioningError(
            'PROVISIONING_CONFLICT',
            'Provisioning state changed after planning; review a new dry-run.',
            { conflicts: transactionPlan.conflicts }
          );
        }
        const operation = await tx.provisioningOperation.create({
          data: {
            idempotencyKey: input.idempotencyKey,
            inputHash: transactionPlan.inputHash,
            operationType: 'PROVISIONING',
            status: 'PENDING'
          }
        });
        await tx.provisioningOperation.update({
          where: { id: operation.id },
          data: { status: 'VALIDATING', approvedBy: transactionPlan.approver.id, approvedAt: now }
        });
        const organisation = await tx.organisation.create({
          data: {
            name: input.organisationName,
            slug: input.organisationSlug,
            type: 'INSTALLER',
            status: 'PROVISIONING',
            verified: false
          }
        });
        const installer = await tx.installer.create({
          data: {
            organisationId: organisation.id,
            name: input.installerName,
            slug: input.installerSlug,
            seaiCompanyId: input.seaiCompanyId,
            websiteDomain: input.websiteDomain ?? null,
            county: input.county ?? null
          }
        });
        const user = await tx.user.create({
          data: {
            email: input.ownerEmail,
            displayName: input.ownerDisplayName,
            passwordHash,
            status: 'INVITED',
            mustChangePassword: true,
            temporaryCredentialExpiresAt
          }
        });
        const membership = await tx.organisationMembership.create({
          data: {
            organisationId: organisation.id,
            userId: user.id,
            status: 'ACTIVE',
            isOwner: true,
            role: 'ORGANISATION_OWNER'
          }
        });
        await tx.provisioningOperation.update({
          where: { id: operation.id },
          data: { status: 'READY', organisationId: organisation.id }
        });

        const auditBase = {
          actor: transactionPlan.approver.displayName,
          actorType: 'HUMAN_USER' as const,
          userId: transactionPlan.approver.id,
          organisationId: organisation.id,
          provisioningOperationId: operation.id,
          source: 'tenant-provisioning-service'
        };
        for (const event of [
          { action: 'PROVISIONING_REQUESTED', resourceType: 'provisioning_operation', resourceId: operation.id },
          { action: 'ORGANISATION_CREATED', resourceType: 'organisation', resourceId: organisation.id },
          { action: 'INSTALLER_CREATED', resourceType: 'installer', resourceId: installer.id },
          { action: 'USER_CREATED', resourceType: 'user', resourceId: user.id },
          { action: 'MEMBERSHIP_CREATED', resourceType: 'organisation_membership', resourceId: membership.id },
          { action: 'OWNER_ASSIGNED', resourceType: 'organisation_membership', resourceId: membership.id },
          { action: 'TEMPORARY_CREDENTIAL_CREATED', resourceType: 'user', resourceId: user.id }
        ]) {
          await writeAuditEvent(tx, { ...auditBase, ...event });
        }

        return {
          operationId: operation.id,
          organisationId: organisation.id,
          installerId: installer.id,
          userId: user.id,
          membershipId: membership.id,
          approver: transactionPlan.approver
        };
      },
      { isolationLevel: 'Serializable' }
    );
  } catch (error) {
    temporaryCredential = undefined;
    if (error instanceof TenantProvisioningError) throw error;
    throw new TenantProvisioningError('TRANSACTION_FAILED', 'Provisioning transaction failed and was rolled back.');
  }

  let receipt: CredentialDeliveryReceipt;
  try {
    receipt = validateReceipt(
      await args.deliveryAdapter.deliverTemporaryCredential({
        recipientEmail: input.ownerEmail,
        recipientName: input.ownerDisplayName,
        organisationName: input.organisationName,
        loginUrl: args.loginUrl,
        temporaryCredential,
        expiresAt: temporaryCredentialExpiresAt,
        operationId: records.operationId
      })
    );
  } catch {
    temporaryCredential = undefined;
    try {
      await recordDeliveryFailure(args.db, records, now);
    } catch {
      throw new TenantProvisioningError(
        'DELIVERY_FAILED',
        'Credential delivery failed and recovery state could not be confirmed.'
      );
    }
    throw new TenantProvisioningError(
      'DELIVERY_FAILED',
      'Credential delivery failed; the credential was revoked and reviewed recovery is required.'
    );
  } finally {
    temporaryCredential = undefined;
  }

  try {
    await args.db.$transaction(async (tx) => {
      await writeAuditEvent(tx, {
        action: 'TEMPORARY_CREDENTIAL_DELIVERY_SUCCEEDED',
        actor: records.approver.displayName,
        actorType: 'HUMAN_USER',
        userId: records.approver.id,
        organisationId: records.organisationId,
        provisioningOperationId: records.operationId,
        resourceType: 'user',
        resourceId: records.userId,
        source: 'tenant-provisioning-service',
        metadata: { providerDeliveryId: receipt.providerDeliveryId, status: receipt.status }
      });
      await tx.provisioningOperation.update({
        where: { id: records.operationId },
        data: { status: 'COMPLETED', completedAt: now }
      });
      await writeAuditEvent(tx, {
        action: 'PROVISIONING_COMPLETED',
        actor: records.approver.displayName,
        actorType: 'HUMAN_USER',
        userId: records.approver.id,
        organisationId: records.organisationId,
        provisioningOperationId: records.operationId,
        resourceType: 'provisioning_operation',
        resourceId: records.operationId,
        source: 'tenant-provisioning-service'
      });
    });
  } catch {
    throw new TenantProvisioningError(
      'TRANSACTION_FAILED',
      'Provisioning completion receipt could not be recorded; reviewed recovery is required.'
    );
  }

  return {
    idempotentReplay: false,
    operation: { id: records.operationId, status: 'COMPLETED', completedAt: now },
    organisation: {
      id: records.organisationId,
      name: input.organisationName,
      slug: input.organisationSlug,
      status: 'PROVISIONING'
    },
    installer: { id: records.installerId, name: input.installerName, slug: input.installerSlug },
    owner: {
      id: records.userId,
      displayName: input.ownerDisplayName,
      email: input.ownerEmail,
      status: 'INVITED',
      mustChangePassword: true,
      temporaryCredentialExpiresAt
    },
    membership: {
      id: records.membershipId,
      role: 'ORGANISATION_OWNER',
      isOwner: true,
      status: 'ACTIVE'
    },
    delivery: receipt
  };
}
