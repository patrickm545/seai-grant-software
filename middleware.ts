import { NextRequest, NextResponse } from 'next/server';

const PILOT_SESSION_COOKIE_NAME = 'solargrant_session';

function needsAdmin(request: NextRequest) {
  const { pathname } = request.nextUrl;
  return (
    pathname.startsWith('/admin/dashboard') ||
    pathname.startsWith('/admin/leads') ||
    pathname.startsWith('/installer-review-emerald')
  );
}

export function middleware(request: NextRequest) {
  if (!needsAdmin(request)) return NextResponse.next();

  if (request.cookies.has(PILOT_SESSION_COOKIE_NAME)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/installer-review-emerald/:path*']
};
