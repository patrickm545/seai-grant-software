import { NextRequest, NextResponse } from 'next/server';
import { invalidatePilotSession, PILOT_SESSION_COOKIE_NAME } from '@/lib/pilot-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await invalidatePilotSession({
    sessionToken: request.cookies.get(PILOT_SESSION_COOKIE_NAME)?.value
  });

  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.cookies.set({
    name: PILOT_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
  return response;
}
