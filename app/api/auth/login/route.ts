import { NextRequest, NextResponse } from 'next/server';
import {
  authenticatePilotCredentials,
  GENERIC_LOGIN_ERROR,
  PILOT_SESSION_COOKIE_NAME,
  pilotSessionCookieOptions,
  safePilotRedirect
} from '@/lib/pilot-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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
    result = await authenticatePilotCredentials({ email, password });
  } catch {
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
