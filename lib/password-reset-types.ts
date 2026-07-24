import type {
  PasswordResetRequest as PrismaPasswordResetRequest,
  PasswordResetRevocationReason as PrismaPasswordResetRevocationReason,
  PasswordResetStatus as PrismaPasswordResetStatus
} from '@prisma/client';

export type PasswordResetToken = string & { readonly __passwordResetToken: unique symbol };
export type PasswordResetTokenDigest = string & { readonly __passwordResetTokenDigest: unique symbol };

export type PasswordResetStatus = PrismaPasswordResetStatus;
export type PasswordResetRevocationReason = PrismaPasswordResetRevocationReason;
export type PasswordResetRequest = PrismaPasswordResetRequest;

export const passwordResetFailureReasons = [
  'TOKEN_MALFORMED',
  'TOKEN_NOT_FOUND',
  'TOKEN_EXPIRED',
  'TOKEN_NOT_DISPATCHED',
  'TOKEN_ALREADY_CONSUMED',
  'TOKEN_REVOKED',
  'EXCHANGE_HANDLE_INVALID',
  'ACCOUNT_INELIGIBLE',
  'DELIVERY_UNAVAILABLE',
  'RATE_LIMIT_UNAVAILABLE',
  'CONFIGURATION_INVALID',
  'PERSISTENCE_UNAVAILABLE'
] as const;

export type PasswordResetFailureReason = (typeof passwordResetFailureReasons)[number];

export type PasswordResetAuditMetadata = {
  correlationId?: string;
  resetRequestId?: string;
  userId?: string;
  organisationId?: string;
  membershipId?: string;
  providerName?: string;
  providerReceiptId?: string;
  status?: PasswordResetStatus;
  reason?: PasswordResetFailureReason | PasswordResetRevocationReason;
  revokedSessionCount?: number;
  occurredAt?: string;
};

export type PasswordResetLifecycle =
  | 'PENDING'
  | 'DISPATCHED'
  | 'EXCHANGED'
  | 'CONSUMED'
  | 'REVOKED'
  | 'EXPIRED';

export function resolvePasswordResetLifecycle(
  request: Pick<
    PasswordResetRequest,
    'status' | 'expiresAt' | 'consumedAt' | 'revokedAt'
  >,
  now = new Date()
): PasswordResetLifecycle {
  if (request.consumedAt || request.status === 'CONSUMED') return 'CONSUMED';
  if (request.revokedAt || request.status === 'REVOKED') return 'REVOKED';
  if (request.expiresAt <= now) return 'EXPIRED';
  return request.status;
}

export function isPasswordResetRequestActive(
  request: Pick<
    PasswordResetRequest,
    'status' | 'expiresAt' | 'consumedAt' | 'revokedAt' | 'dispatchedAt'
  >,
  now = new Date()
) {
  const lifecycle = resolvePasswordResetLifecycle(request, now);
  return (
    (lifecycle === 'DISPATCHED' || lifecycle === 'EXCHANGED') &&
    Boolean(request.dispatchedAt)
  );
}
