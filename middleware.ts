import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/upload', '/topics', '/quiz', '/report', '/plan', '/assistant'];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PROTECTED.some((p) => path === p || path.startsWith(p + '/')) && !req.cookies.get('gf_session')?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/upload/:path*', '/topics/:path*', '/quiz/:path*', '/report/:path*', '/plan/:path*', '/assistant/:path*'] };
