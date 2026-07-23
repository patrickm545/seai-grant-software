import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  classifyPilotAuthInfrastructureFailure,
  logPilotAuthInfrastructureFailure
} from '../../lib/auth-observability';
import { handlePilotLogin } from '../../lib/pilot-login-handler';
import { hashSessionToken } from '../../lib/pilot-auth';

function loginRequest(headers: HeadersInit = {}) {
  return new NextRequest('https://example.test/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({
      email: 'pilot@example.test',
      password: 'credential-not-logged'
    })
  });
}

test('invalid credentials return the generic 401 response', async () => {
  const response = await handlePilotLogin(loginRequest(), {
    authenticate: async () => null,
    logInfrastructureFailure: () => assert.fail('401 must not be logged as infrastructure failure')
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'Email or password is incorrect, or this account is not available.'
  });
});

test('infrastructure failure returns generic 503 and logs only safe diagnostics', async () => {
  const entries: unknown[][] = [];
  const infrastructureError = Object.assign(
    new Error('database URL password=secret session-token=secret customer@example.test'),
    { code: 'P2022' }
  );
  const response = await handlePilotLogin(loginRequest({ 'x-vercel-id': 'dub1::iad1::safe-request' }), {
    authenticate: async () => {
      throw infrastructureError;
    },
    logInfrastructureFailure: ({ error, request }) => {
      logPilotAuthInfrastructureFailure({
        error,
        request,
        logger: { error: (...args: unknown[]) => entries.push(args) }
      });
    }
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Sign-in is temporarily unavailable.' });
  assert.equal(entries.length, 1);
  const serialised = JSON.stringify(entries);
  assert.match(serialised, /database_schema_mismatch/);
  assert.match(serialised, /dub1::iad1::safe-request/);
  assert.doesNotMatch(serialised, /password=|session-token|customer@example|P2022/);
});

test('successful login creates a secure session cookie and approved redirect', async () => {
  const expiresAt = new Date('2026-07-24T03:00:00.000Z');
  const response = await handlePilotLogin(loginRequest(), {
    authenticate: async () => ({
      context: {} as never,
      sessionKind: 'NORMAL',
      sessionToken: 'opaque-session-token',
      expiresAt
    }),
    logInfrastructureFailure: () => assert.fail('successful login must not log a failure')
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { redirectTo: '/admin/dashboard' });
  const cookie = response.headers.get('set-cookie') ?? '';
  assert.match(cookie, /solargrant_session=opaque-session-token/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
});

test('missing auth session pepper fails closed', () => {
  const previous = process.env.AUTH_SESSION_PEPPER;
  delete process.env.AUTH_SESSION_PEPPER;
  try {
    assert.throws(() => hashSessionToken('opaque-session-token'), /AUTH_SESSION_PEPPER/);
  } finally {
    if (previous === undefined) delete process.env.AUTH_SESSION_PEPPER;
    else process.env.AUTH_SESSION_PEPPER = previous;
  }
});

test('auth infrastructure categories distinguish configuration and database availability', () => {
  assert.equal(
    classifyPilotAuthInfrastructureFailure(new Error('AUTH_SESSION_PEPPER must contain at least 32 characters.')),
    'auth_configuration_invalid'
  );
  assert.equal(classifyPilotAuthInfrastructureFailure({ code: 'P1001' }), 'database_unavailable');
});
