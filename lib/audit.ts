import type { AuditActorType, AuditOutcome, Prisma, PrismaClient } from '@prisma/client';
import type { ActorContext, OrganisationContext } from './identity';

export type AuditActor = 'homeowner' | 'admin' | 'system';

type AuditMetadata = Prisma.InputJsonValue | undefined;
type DbClient = PrismaClient | Prisma.TransactionClient;

const sensitiveMetadataKeyPattern = /(password|secret|token|contentbytes|documentcontent|fulldocument|rawdocument)/i;

function legacyActorType(actor: string): AuditActorType {
  const normalizedActor = actor.trim().toLowerCase();
  if (normalizedActor === 'homeowner' || normalizedActor === 'customer portal' || normalizedActor === 'public intake') {
    return 'PUBLIC_TOKEN';
  }
  if (normalizedActor === 'system' || normalizedActor === 'clada os') return 'SYSTEM';
  if (normalizedActor === 'service') return 'SERVICE';
  return 'HUMAN_USER';
}

function actorLabel(actor: ActorContext) {
  return actor.displayName;
}

export function buildAuditActorFromContext(context: OrganisationContext) {
  return {
    actor: actorLabel(context.actor),
    actorType: 'HUMAN_USER' as const,
    userId: context.actor.actorType === 'human_user' ? context.actor.userId : undefined,
    membershipId: context.membershipId,
    organisationId: context.organisationId
  };
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sanitizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }

  if (isJsonRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveMetadataKeyPattern.test(key))
        .map(([key, childValue]) => [key, sanitizeJsonValue(childValue)])
    );
  }

  return value;
}

export function sanitizeAuditMetadata(metadata: AuditMetadata): AuditMetadata {
  if (metadata === undefined) return undefined;
  return sanitizeJsonValue(metadata) as Prisma.InputJsonValue;
}

function metadataOrganisationId(metadata: AuditMetadata) {
  if (!isJsonRecord(metadata)) return undefined;
  const metadataRecord = metadata as Record<string, unknown>;
  return typeof metadataRecord.organisationId === 'string' ? metadataRecord.organisationId : undefined;
}

export async function writeAuditEvent(
  tx: DbClient,
  input: {
    leadId?: string | null;
    organisationId?: string | null;
    context?: OrganisationContext | null;
    action: string;
    actor?: AuditActor | string;
    actorType?: AuditActorType;
    userId?: string | null;
    membershipId?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    source?: string | null;
    outcome?: AuditOutcome;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const actorFromContext = input.context ? buildAuditActorFromContext(input.context) : undefined;
  const legacyActor = input.actor ?? actorFromContext?.actor ?? 'system';
  const resourceType = input.resourceType ?? (input.leadId ? 'lead' : undefined);
  const resourceId = input.resourceId ?? input.leadId ?? undefined;
  const sanitizedMetadata = sanitizeAuditMetadata(input.metadata);

  await tx.auditLog.create({
    data: {
      leadId: input.leadId ?? null,
      organisationId: input.organisationId ?? actorFromContext?.organisationId ?? metadataOrganisationId(input.metadata) ?? null,
      action: input.action,
      actor: legacyActor,
      actorType: input.actorType ?? actorFromContext?.actorType ?? legacyActorType(legacyActor),
      userId: input.userId ?? actorFromContext?.userId ?? null,
      membershipId: input.membershipId ?? actorFromContext?.membershipId ?? null,
      resourceType,
      resourceId,
      source: input.source ?? null,
      outcome: input.outcome ?? 'SUCCEEDED',
      metadataJson: sanitizedMetadata
    }
  });
}

export async function writeAuditLog(
  tx: DbClient,
  input: {
    leadId?: string | null;
    organisationId?: string | null;
    context?: OrganisationContext | null;
    action: string;
    actor: AuditActor | string;
    actorType?: AuditActorType;
    resourceType?: string | null;
    resourceId?: string | null;
    source?: string | null;
    outcome?: AuditOutcome;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await writeAuditEvent(tx, input);
}
