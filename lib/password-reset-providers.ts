import type { PasswordResetFailureReason } from './password-reset-types';

export class PasswordResetConfigurationError extends Error {
  constructor(
    public readonly dependency:
      | 'EMAIL_PROVIDER'
      | 'RATE_LIMITER'
      | 'CLEANUP_PROVIDER',
    message?: string
  ) {
    super(message ?? `Password reset ${dependency.toLowerCase()} is not configured.`);
    this.name = 'PasswordResetConfigurationError';
  }
}

export type PasswordResetEmailMessage = {
  recipientEmail: string;
  recipientName: string;
  expiresAt: Date;
  resetLink: string;
  correlationId: string;
};

export type PasswordResetNotificationResult = {
  status: 'ACCEPTED';
  providerName: string;
  providerReceiptId: string;
};

export interface PasswordResetEmailProvider {
  readonly name: string;
  sendPasswordReset(
    message: PasswordResetEmailMessage
  ): Promise<PasswordResetNotificationResult>;
}

export type PasswordResetRateLimitRequest = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export type PasswordResetRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
};

export interface PasswordResetRateLimiter {
  consume(
    request: PasswordResetRateLimitRequest
  ): Promise<PasswordResetRateLimitResult>;
}

export interface PasswordResetCleanupProvider {
  removeTerminalRequests(input: {
    terminalBefore: Date;
    limit: number;
  }): Promise<{ removed: number }>;
}

export type PasswordResetProviderFailure = {
  reason: Extract<
    PasswordResetFailureReason,
    'DELIVERY_UNAVAILABLE' | 'RATE_LIMIT_UNAVAILABLE' | 'CONFIGURATION_INVALID'
  >;
};

export class UnconfiguredPasswordResetEmailProvider
  implements PasswordResetEmailProvider
{
  readonly name = 'unconfigured';

  async sendPasswordReset(): Promise<never> {
    throw new PasswordResetConfigurationError('EMAIL_PROVIDER');
  }
}

export class UnconfiguredPasswordResetRateLimiter
  implements PasswordResetRateLimiter
{
  async consume(): Promise<never> {
    throw new PasswordResetConfigurationError('RATE_LIMITER');
  }
}

export class UnconfiguredPasswordResetCleanupProvider
  implements PasswordResetCleanupProvider
{
  async removeTerminalRequests(): Promise<never> {
    throw new PasswordResetConfigurationError('CLEANUP_PROVIDER');
  }
}
