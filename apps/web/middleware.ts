/**
 * Edge-runtime route guard. Redirects unauthenticated users from (app) routes
 * to /login. Public routes: /, /login, /register, /forgot-password,
 * /verify-email, /api/auth/*, /api/health.
 *
 * Cookie naming: Better Auth prefixes its session cookies with `__Secure-`
 * on HTTPS (Vercel production), so the middleware has to accept BOTH the
 * bare name (local dev / HTTP) and the prefixed name. Missing this check
 * used to bounce every logged-in user on the live deployment back to /login.
 */
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/verify-email'];

const PUBLIC_PREFIXES = ['/api/auth', '/api/health', '/_next', '/favicon'];

/**
 * Each name we look for has a `__Secure-` variant that Better Auth writes
 * in HTTPS contexts, plus the original name used in dev / HTTP. Both are
 * checked so the guard doesn't bounce logged-in users on production.
 */
const COOKIE_NAMES: string[] = [
  'studyflow_session',
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
  'better-auth.session',
  '__Secure-better-auth.session',
  'better-auth.session_data',
  '__Secure-better-auth.session_data',
];

function hasSessionCookie(req: NextRequest): boolean {
  return COOKIE_NAMES.some((n) => req.cookies.get(n)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api')) {
    // API routes handle their own auth via requireAuth middleware.
    return NextResponse.next();
  }
  if (!hasSessionCookie(req)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?from=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};