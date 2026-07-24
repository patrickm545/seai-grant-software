import type {
  PasswordResetRequest,
  PasswordResetRevocationReason,
  PasswordResetStatus,
  Prisma,
  PrismaClient
} from '@prisma/client';
import { prisma } from './prisma';
import type { PasswordResetTokenDigest } from './password-reset-types';

export type CreatePasswordResetRequest = {
  userId: string;
  tokenDigest: PasswordResetTokenDigest;
  expiresAt: Date;
  correlationId?: string;
  createdAt?: Date;
};

export interface PasswordResetRequestRepository {
  findById(id: string): Promise<PasswordResetRequest | null>;
  findByTokenDigest(
    tokenDigest: PasswordResetTokenDigest
  ): Promise<PasswordResetRequest | null>;
  findByExchangeDigest(
    exchangeDigest: PasswordResetTokenDigest
  ): Promise<PasswordResetRequest | null>;
  createSuperseding(
    input: CreatePasswordResetRequest
  ): Promise<PasswordResetRequest>;
  markDispatched(input: {
    id: string;
    dispatchedAt: Date;
    providerName: string;
    providerReceiptId: string;
  }): Promise<PasswordResetRequest | null>;
  markExchanged(input: {
    id: string;
    exchangeDigest: PasswordResetTokenDigest;
    exchangedAt: Date;
  }): Promise<PasswordResetRequest | null>;
  markConsumed(input: {
    id: string;
    consumedAt: Date;
  }): Promise<PasswordResetRequest | null>;
  revoke(input: {
    id: string;
    revokedAt: Date;
    reason: PasswordResetRevocationReason;
  }): Promise<PasswordResetRequest | null>;
  removeTerminalBefore(input: {
    terminalBefore: Date;
    limit: number;
  }): Promise<number>;
}

const nonTerminalStatuses = [
  'PENDING',
  'DISPATCHED',
  'EXCHANGED'
] satisfies PasswordResetStatus[];

function validateCleanupLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new RangeError('Password reset cleanup limit must be between 1 and 1000.');
  }
}

export class PrismaPasswordResetRequestRepository
  implements PasswordResetRequestRepository
{
  constructor(private readonly db: PrismaClient = prisma) {}

  findById(id: string) {
    return this.db.passwordResetRequest.findUnique({ where: { id } });
  }

  findByTokenDigest(tokenDigest: PasswordResetTokenDigest) {
    return this.db.passwordResetRequest.findUnique({ where: { tokenDigest } });
  }

  findByExchangeDigest(exchangeDigest: PasswordResetTokenDigest) {
    return this.db.passwordResetRequest.findUnique({ where: { exchangeDigest } });
  }

  createSuperseding(input: CreatePasswordResetRequest) {
    const createdAt = input.createdAt ?? new Date();
    return this.db.$transaction(
      async (tx) => {
        await tx.passwordResetRequest.updateMany({
          where: {
            userId: input.userId,
            status: { in: nonTerminalStatuses },
            consumedAt: null,
            revokedAt: null
          },
          data: {
            status: 'REVOKED',
            revokedAt: createdAt,
            revocationReason: 'SUPERSEDED'
          }
        });

        return tx.passwordResetRequest.create({
          data: {
            userId: input.userId,
            tokenDigest: input.tokenDigest,
            expiresAt: input.expiresAt,
            correlationId: input.correlationId,
            createdAt
          }
        });
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async markDispatched(input: {
    id: string;
    dispatchedAt: Date;
    providerName: string;
    providerReceiptId: string;
  }) {
    return this.transition(
      input.id,
      {
        status: 'PENDING',
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: input.dispatchedAt }
      },
      {
        status: 'DISPATCHED',
        dispatchedAt: input.dispatchedAt,
        providerName: input.providerName,
        providerReceiptId: input.providerReceiptId
      }
    );
  }

  async markExchanged(input: {
    id: string;
    exchangeDigest: PasswordResetTokenDigest;
    exchangedAt: Date;
  }) {
    return this.transition(
      input.id,
      {
        status: { in: ['DISPATCHED', 'EXCHANGED'] },
        dispatchedAt: { not: null },
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: input.exchangedAt }
      },
      {
        status: 'EXCHANGED',
        exchangeDigest: input.exchangeDigest,
        exchangedAt: input.exchangedAt
      }
    );
  }

  async markConsumed(input: { id: string; consumedAt: Date }) {
    return this.transition(
      input.id,
      {
        status: 'EXCHANGED',
        dispatchedAt: { not: null },
        exchangeDigest: { not: null },
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: input.consumedAt }
      },
      {
        status: 'CONSUMED',
        consumedAt: input.consumedAt,
        exchangeDigest: null
      }
    );
  }

  async revoke(input: {
    id: string;
    revokedAt: Date;
    reason: PasswordResetRevocationReason;
  }) {
    return this.transition(
      input.id,
      {
        status: { in: nonTerminalStatuses },
        consumedAt: null,
        revokedAt: null
      },
      {
        status: 'REVOKED',
        revokedAt: input.revokedAt,
        revocationReason: input.reason,
        exchangeDigest: null
      }
    );
  }

  async removeTerminalBefore(input: {
    terminalBefore: Date;
    limit: number;
  }) {
    validateCleanupLimit(input.limit);
    return this.db.$transaction(async (tx) => {
      const candidates = await tx.passwordResetRequest.findMany({
        where: {
          status: { in: ['CONSUMED', 'REVOKED'] },
          updatedAt: { lt: input.terminalBefore }
        },
        select: { id: true },
        orderBy: { updatedAt: 'asc' },
        take: input.limit
      });
      if (candidates.length === 0) return 0;

      const result = await tx.passwordResetRequest.deleteMany({
        where: { id: { in: candidates.map(({ id }) => id) } }
      });
      return result.count;
    });
  }

  private async transition(
    id: string,
    where: Prisma.PasswordResetRequestWhereInput,
    data: Prisma.PasswordResetRequestUpdateManyMutationInput
  ) {
    return this.db.$transaction(async (tx) => {
      const result = await tx.passwordResetRequest.updateMany({
        where: { id, ...where },
        data
      });
      if (result.count !== 1) return null;
      return tx.passwordResetRequest.findUnique({ where: { id } });
    });
  }
}
