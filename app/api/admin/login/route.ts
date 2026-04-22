import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminSessionValue, verifyAdminPassword } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const password = String(body.get('password') || '');

  if (!verifyAdminPassword(password)) {
    return NextResponse.redirect(new URL('/admin?error=invalid-password', request.url));
  }

  let sessionValue: string;
  try {
    sessionValue = await createAdminSessionValue();
  } catch {
    return NextResponse.redirect(new URL('/admin?error=config-error', request.url));
  }

  const response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: sessionValue,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12
  });

  return response;
}
