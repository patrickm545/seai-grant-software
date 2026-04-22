import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0
  });
  return response;
}
