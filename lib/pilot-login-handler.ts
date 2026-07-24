import { NextRequest, NextResponse } from 'next/server';
import { logPilotAuthInfrastructureFailure } from './auth-observability';
import {
  authenticatePilotCredentials,
  GENERIC_LOGIN_ERROR,
  PILOT_SESSION_COOKIE_NAME,
  pilotSessionCookieOptions,
  safePilotRedirect
} from './pilot-auth';

type LoginResult = Awaited<ReturnType<typeof authenticatePilotCredentials>>;

type LoginDependencies = {
  authenticate: (args: { email: string; password: string }) => Promise<LoginResult>;
  logInfrastructureFailure: typeof logPilotAuthInfrastructureFailure;
};

const defaultDependencies: LoginDependencies = {
  authenticate: authenticatePilotCredentials,
  logInfrastructureFailure: logPilotAuthInfrastructureFailure
};

export async function handlePilotLogin(
  request: NextRequest,
  dependencies: LoginDependencies = defaultDependencies
) {
  let input: { email?: unknown; password?: unknown; next?: unknown };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 400 });
  }

  const email = typeof input.email === 'string' ? input.email : '';
  const password = typeof input.password === 'string' ? input.password : '';

  let result;
  try {
    result = await dependencies.authenticate({ email, password });
  } catch (error) {
    dependencies.logInfrastructureFailure({ error, request });
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }

  if (!result) {
    return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
  }

  const response = NextResponse.json({
    redirectTo: result.sessionKind === 'RESTRICTED_FIRST_LOGIN'
      ? '/first-login/password'
      : safePilotRedirect(typeof input.next === 'string' ? input.next : null)
  });
  response.cookies.set({
    name: PILOT_SESSION_COOKIE_NAME,
    value: result.sessionToken,
    ...pilotSessionCookieOptions(result.expiresAt)
  });
  return response;
}
