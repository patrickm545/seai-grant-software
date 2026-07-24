import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  PasswordResetToken,
  PasswordResetTokenDigest
} from './password-reset-types';

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export class PasswordResetTokenConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordResetTokenConfigurationError';
  }
}

export class PasswordResetTokenService {
  private readonly pepper: Buffer;

  constructor(pepper: string | Buffer) {
    const candidate = Buffer.isBuffer(pepper)
      ? Buffer.from(pepper)
      : Buffer.from(pepper, 'utf8');
    if (candidate.length < PASSWORD_RESET_TOKEN_BYTES) {
      throw new PasswordResetTokenConfigurationError(
        'Password reset token key material must contain at least 32 bytes.'
      );
    }
    this.pepper = candidate;
  }

  generate(): PasswordResetToken {
    return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url') as PasswordResetToken;
  }

  digest(token: string): PasswordResetTokenDigest {
    return createHmac('sha256', this.pepper)
      .update(token, 'utf8')
      .digest('hex') as PasswordResetTokenDigest;
  }

  verify(token: string, expectedDigest: string): boolean {
    const actual = Buffer.from(this.digest(token), 'hex');
    const decodedExpected = Buffer.from(expectedDigest, 'hex');
    const expected =
      decodedExpected.length === actual.length
        ? decodedExpected
        : Buffer.alloc(actual.length);
    const matches = timingSafeEqual(actual, expected);
    return decodedExpected.length === actual.length && matches;
  }

  expiresAt(createdAt = new Date()): Date {
    return new Date(createdAt.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
  }

  isExpired(expiresAt: Date, now = new Date()): boolean {
    return expiresAt <= now;
  }
}
