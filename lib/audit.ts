import type { Prisma } from '@prisma/client';

export type AuditActor = 'homeowner' | 'admin' | 'system';

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    leadId?: string | null;
    action: string;
    actor: AuditActor | string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await tx.auditLog.create({
    data: {
      leadId: input.leadId ?? null,
      action: input.action,
      actor: input.actor,
      metadataJson: input.metadata ?? undefined
    }
  });
}
