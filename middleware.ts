import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionValue } from '@/lib/admin-auth';

function needsAdmin(request: NextRequest) {
  const { pathname } = request.nextUrl;
  return pathname.startsWith('/admin/dashboard') || pathname.startsWith('/admin/leads') || pathname.startsWith('/installer-review-emerald');
}

export async function middleware(request: NextRequest) {
  if (!needsAdmin(request)) return NextResponse.next();

  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await verifyAdminSessionValue(session)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/admin';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/installer-review-emerald/:path*']
};
