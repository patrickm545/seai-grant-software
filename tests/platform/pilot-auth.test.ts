import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import {
  hashPilotPassword,
  normalizePilotEmail,
  safePilotRedirect,
  validateFirstLoginPassword
} from '../../lib/pilot-auth';

test('normalises pilot email and hashes passwords with Argon2id', async () => {
  assert.equal(normalizePilotEmail('  OWNER@Example.IE '), 'owner@example.ie');
  const password = 'a-secure-pilot-password';
  const passwordHash = await hashPilotPassword(password);
  assert.notEqual(passwordHash, password);
  assert.match(passwordHash, /^\$argon2id\$/);
});

test('rejects short pilot passwords', async () => {
  await assert.rejects(() => hashPilotPassword('short'), /at least 12 characters/);
});

test('allows only approved internal post-login redirects', () => {
  assert.equal(safePilotRedirect('/installer-review-emerald/leads?stage=NEW'), '/installer-review-emerald/leads?stage=NEW');
  assert.equal(safePilotRedirect('/admin/dashboard'), '/admin/dashboard');
  assert.equal(safePilotRedirect('https://evil.example'), '/admin/dashboard');
  assert.equal(safePilotRedirect('//evil.example/admin'), '/admin/dashboard');
  assert.equal(safePilotRedirect('/privacy'), '/admin/dashboard');
});

test('middleware redirects unauthenticated installer pages to login', () => {
  const response = middleware(new NextRequest('https://example.test/installer-review-emerald/leads?stage=NEW'));
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get('location'),
    'https://example.test/login?next=%2Finstaller-review-emerald%2Fleads%3Fstage%3DNEW'
  );
});

test('middleware lets a session-cookie request reach server-side validation', () => {
  const request = new NextRequest('https://example.test/admin/dashboard', {
    headers: { cookie: 'solargrant_session=opaque-token' }
  });
  const response = middleware(request);
  assert.equal(response.headers.get('x-middleware-next'), '1');
});

test('first-login password policy enforces confirmation, length, weak-password, and context rules', () => {
  const base = {
    newPassword: 'Maple!River!Orbit!47',
    confirmation: 'Maple!River!Orbit!47',
    email: 'owner@example.test',
    userName: 'Aisling Murphy',
    organisationName: 'Emerald Solar',
    organisationSlug: 'emerald-solar'
  };

  assert.equal(validateFirstLoginPassword(base), null);
  assert.equal(validateFirstLoginPassword({ ...base, confirmation: 'different-value' }), 'PASSWORD_CONFIRMATION_MISMATCH');
  assert.equal(validateFirstLoginPassword({ ...base, newPassword: 'TooShort1!', confirmation: 'TooShort1!' }), 'PASSWORD_TOO_SHORT');
  assert.equal(validateFirstLoginPassword({ ...base, newPassword: 'Password123456!', confirmation: 'Password123456!' }), 'PASSWORD_TOO_WEAK');
  assert.equal(validateFirstLoginPassword({ ...base, newPassword: 'Emerald!Orbit!47', confirmation: 'Emerald!Orbit!47' }), 'PASSWORD_CONTEXT_DERIVED');
  const tooLong = 'x'.repeat(129);
  assert.equal(validateFirstLoginPassword({ ...base, newPassword: tooLong, confirmation: tooLong }), 'PASSWORD_TOO_LONG');
});
