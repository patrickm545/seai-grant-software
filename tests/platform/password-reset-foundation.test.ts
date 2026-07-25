import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPasswordResetAuditMetadata,
  passwordResetAuditActions
} from '../../lib/password-reset-audit';
import {
  PASSWORD_RESET_PRODUCTION_ORIGIN,
  PasswordResetOriginConfigurationError,
  resolvePasswordResetCanonicalOrigin
} from '../../lib/password-reset-origin';
import {
  PasswordResetConfigurationError,
  UnconfiguredPasswordResetCleanupProvider,
  UnconfiguredPasswordResetEmailProvider,
  UnconfiguredPasswordResetRateLimiter
} from '../../lib/password-reset-providers';
import {
  isPasswordResetRequestActive,
  resolvePasswordResetLifecycle
} from '../../lib/password-reset-types';

const future = new Date('2026-07-24T13:00:00.000Z');
const now = new Date('2026-07-24T12:00:00.000Z');

test('password reset lifecycle derives terminal and expiry state safely', () => {
  assert.equal(
    resolvePasswordResetLifecycle(
      { status: 'DISPATCHED', expiresAt: future, consumedAt: null, revokedAt: null },
      now
    ),
    'DISPATCHED'
  );
  assert.equal(
    resolvePasswordResetLifecycle(
      { status: 'DISPATCHED', expiresAt: now, consumedAt: null, revokedAt: null },
      now
    ),
    'EXPIRED'
  );
  assert.equal(
    resolvePasswordResetLifecycle(
      { status: 'DISPATCHED', expiresAt: future, consumedAt: now, revokedAt: null },
      now
    ),
    'CONSUMED'
  );
  assert.equal(
    resolvePasswordResetLifecycle(
      { status: 'EXCHANGED', expiresAt: future, consumedAt: null, revokedAt: now },
      now
    ),
    'REVOKED'
  );
});

test('only dispatched or exchanged unexpired requests are active', () => {
  assert.equal(
    isPasswordResetRequestActive(
      {
        status: 'DISPATCHED',
        expiresAt: future,
        dispatchedAt: now,
        consumedAt: null,
        revokedAt: null
      },
      now
    ),
    true
  );
  assert.equal(
    isPasswordResetRequestActive(
      {
        status: 'PENDING',
        expiresAt: future,
        dispatchedAt: null,
        consumedAt: null,
        revokedAt: null
      },
      now
    ),
    false
  );
});

test('canonical origin resolver accepts only the exact approved Production origin', () => {
  assert.equal(
    resolvePasswordResetCanonicalOrigin({
      applicationEnvironment: 'production',
      configuredOrigin: PASSWORD_RESET_PRODUCTION_ORIGIN
    }),
    PASSWORD_RESET_PRODUCTION_ORIGIN
  );
  assert.throws(
    () =>
      resolvePasswordResetCanonicalOrigin({
        applicationEnvironment: 'production',
        configuredOrigin: 'https://attacker.example'
      }),
    PasswordResetOriginConfigurationError
  );
});

test('canonical origin resolver requires an allowlisted stable Preview HTTPS origin', () => {
  const previewOrigin = 'https://reset-preview.example.test';
  assert.equal(
    resolvePasswordResetCanonicalOrigin({
      applicationEnvironment: 'preview',
      configuredOrigin: previewOrigin,
      previewOriginAllowlist: [previewOrigin]
    }),
    previewOrigin
  );
  assert.throws(
    () =>
      resolvePasswordResetCanonicalOrigin({
        applicationEnvironment: 'preview',
        configuredOrigin: 'https://unapproved.example.test',
        previewOriginAllowlist: [previewOrigin]
      }),
    PasswordResetOriginConfigurationError
  );
  assert.throws(
    () =>
      resolvePasswordResetCanonicalOrigin({
        applicationEnvironment: 'preview',
        configuredOrigin: PASSWORD_RESET_PRODUCTION_ORIGIN,
        previewOriginAllowlist: [PASSWORD_RESET_PRODUCTION_ORIGIN]
      }),
    PasswordResetOriginConfigurationError
  );
});

test('canonical origin resolver permits only HTTP loopback in Development and test', () => {
  assert.equal(
    resolvePasswordResetCanonicalOrigin({
      applicationEnvironment: 'development',
      configuredOrigin: 'http://localhost:3000'
    }),
    'http://localhost:3000'
  );
  assert.equal(
    resolvePasswordResetCanonicalOrigin({
      applicationEnvironment: 'test',
      configuredOrigin: 'http://127.0.0.1:4000'
    }),
    'http://127.0.0.1:4000'
  );
  for (const configuredOrigin of [
    'https://localhost:3000',
    'http://example.test',
    'http://localhost:3000/path',
    'http://user:pass@localhost:3000'
  ]) {
    assert.throws(
      () =>
        resolvePasswordResetCanonicalOrigin({
          applicationEnvironment: 'development',
          configuredOrigin
        }),
      PasswordResetOriginConfigurationError
    );
  }
});

test('provider-neutral defaults fail closed with explicit dependency errors', async () => {
  const email = new UnconfiguredPasswordResetEmailProvider();
  const limiter = new UnconfiguredPasswordResetRateLimiter();
  const cleanup = new UnconfiguredPasswordResetCleanupProvider();

  await assert.rejects(
    () => email.sendPasswordReset(),
    (error: unknown) =>
      error instanceof PasswordResetConfigurationError &&
      error.dependency === 'EMAIL_PROVIDER'
  );
  await assert.rejects(
    () => limiter.consume(),
    (error: unknown) =>
      error instanceof PasswordResetConfigurationError &&
      error.dependency === 'RATE_LIMITER'
  );
  await assert.rejects(
    () => cleanup.removeTerminalRequests(),
    (error: unknown) =>
      error instanceof PasswordResetConfigurationError &&
      error.dependency === 'CLEANUP_PROVIDER'
  );
});

test('audit definitions cover the accepted events and allowlist metadata only', () => {
  assert.deepEqual(passwordResetAuditActions, [
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_EMAIL_DISPATCH_ATTEMPTED',
    'PASSWORD_RESET_EMAIL_DISPATCHED',
    'PASSWORD_RESET_EMAIL_FAILED',
    'PASSWORD_RESET_TOKEN_REJECTED',
    'PASSWORD_RESET_COMPLETED',
    'PASSWORD_RESET_SESSIONS_REVOKED'
  ]);

  const metadata = buildPasswordResetAuditMetadata({
    correlationId: 'correlation-1',
    resetRequestId: 'reset-1',
    status: 'DISPATCHED',
    providerName: undefined,
    token: 'must-not-survive',
    rawIp: 'must-not-survive'
  } as never);
  assert.deepEqual(metadata, {
    correlationId: 'correlation-1',
    resetRequestId: 'reset-1',
    status: 'DISPATCHED'
  });
});
