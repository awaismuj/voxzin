import { NextResponse, type NextRequest } from 'next/server';
import { classifySuspiciousPath } from '@voxzin/shared';
import { SITE_URL } from '@/lib/site';

const canonicalSite = new URL(SITE_URL);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (request.nextUrl.hostname === `www.${canonicalSite.hostname}`) {
    const url = new URL(request.url);
    url.protocol = canonicalSite.protocol;
    url.host = canonicalSite.host;
    return NextResponse.redirect(url, 308);
  }
  if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) return NextResponse.next();
  if (classifySuspiciousPath(pathname)) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
