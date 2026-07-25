import type { PasswordResetAuditMetadata } from './password-reset-types';

export const passwordResetAuditActions = [
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_EMAIL_DISPATCH_ATTEMPTED',
  'PASSWORD_RESET_EMAIL_DISPATCHED',
  'PASSWORD_RESET_EMAIL_FAILED',
  'PASSWORD_RESET_TOKEN_REJECTED',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORD_RESET_SESSIONS_REVOKED'
] as const;

export type PasswordResetAuditAction =
  (typeof passwordResetAuditActions)[number];

const auditMetadataKeys = [
  'correlationId',
  'resetRequestId',
  'userId',
  'organisationId',
  'membershipId',
  'providerName',
  'providerReceiptId',
  'status',
  'reason',
  'revokedSessionCount',
  'occurredAt'
] as const satisfies readonly (keyof PasswordResetAuditMetadata)[];

export function buildPasswordResetAuditMetadata(
  input: PasswordResetAuditMetadata
): PasswordResetAuditMetadata {
  return Object.fromEntries(
    auditMetadataKeys.flatMap((key) =>
      input[key] === undefined ? [] : [[key, input[key]]]
    )
  ) as PasswordResetAuditMetadata;
}
