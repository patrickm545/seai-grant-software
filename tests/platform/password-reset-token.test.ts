import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_MS,
  PasswordResetTokenConfigurationError,
  PasswordResetTokenService
} from '../../lib/password-reset-token';

const service = new PasswordResetTokenService('a'.repeat(32));

test('password reset tokens contain 32 bytes from the cryptographic random source', () => {
  const first = service.generate();
  const second = service.generate();

  assert.equal(Buffer.from(first, 'base64url').length, PASSWORD_RESET_TOKEN_BYTES);
  assert.equal(Buffer.from(second, 'base64url').length, PASSWORD_RESET_TOKEN_BYTES);
  assert.notEqual(first, second);
});

test('password reset token digests are deterministic, keyed, and do not contain the token', () => {
  const token = service.generate();
  const digest = service.digest(token);
  const otherKeyDigest = new PasswordResetTokenService('b'.repeat(32)).digest(token);

  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(service.digest(token), digest);
  assert.notEqual(otherKeyDigest, digest);
  assert.doesNotMatch(digest, new RegExp(token));
});

test('password reset digest verification accepts only the matching fixed-length digest', () => {
  const token = service.generate();
  const digest = service.digest(token);

  assert.equal(service.verify(token, digest), true);
  assert.equal(service.verify(`${token}x`, digest), false);
  assert.equal(service.verify(token, 'not-a-hex-digest'), false);
  assert.equal(service.verify(token, digest.slice(2)), false);
});

test('password reset digest verification uses the constant-time crypto primitive', () => {
  const source = readFileSync('lib/password-reset-token.ts', 'utf8');
  assert.match(source, /timingSafeEqual\(actual, expected\)/);
});

test('password reset token expiry is exactly 30 minutes with an inclusive boundary', () => {
  const createdAt = new Date('2026-07-24T12:00:00.000Z');
  const expiresAt = service.expiresAt(createdAt);

  assert.equal(expiresAt.getTime() - createdAt.getTime(), PASSWORD_RESET_TOKEN_TTL_MS);
  assert.equal(service.isExpired(expiresAt, new Date(expiresAt.getTime() - 1)), false);
  assert.equal(service.isExpired(expiresAt, expiresAt), true);
});

test('password reset token service fails closed without sufficient key material', () => {
  assert.throws(
    () => new PasswordResetTokenService('too-short'),
    PasswordResetTokenConfigurationError
  );
});
