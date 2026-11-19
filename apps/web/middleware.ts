import { NextResponse, type NextRequest } from 'next/server';
import { classifySuspiciousPath } from '@voxzin/shared';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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
