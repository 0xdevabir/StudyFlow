import { NextRequest, NextResponse } from 'next/server';
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@studyflow/auth';

// Force Node.js runtime — Better Auth + Drizzle need Node APIs (pg, dotenv).
// Vercel defaults dynamic routes to Edge which would fail at bundle time.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const baseHandler = toNextJsHandler(auth);

/**
 * Build the allowlist of origins that may call this auth endpoint.
 *
 * Rules:
 *  - Same-origin requests always pass (we accept any origin matching this
 *    server's own host:port, regardless of env).
 *  - Explicitly trusted origins from env (BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL).
 *  - Local dev ports for the API server (apps/api).
 */
function isAllowedOrigin(req: NextRequest, origin: string | null): boolean {
  if (!origin) return false; // no Origin header (curl, same-origin in some cases) — let it through? be strict here
  // Same-origin: compare scheme + host + port against the request URL.
  try {
    const reqUrl = new URL(req.url);
    const o = new URL(origin);
    if (
      o.protocol === reqUrl.protocol &&
      o.host === reqUrl.host
    ) {
      return true;
    }
  } catch {
    // malformed origin, fall through
  }
  // Trusted env-set origins.
  const trusted = new Set<string>(
    [
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'http://localhost:4000',
    ].filter((v): v is string => typeof v === 'string' && v.length > 0),
  );
  return trusted.has(origin);
}

/** Build CORS headers. Always returns the full header set; the caller decides
 * whether to emit them based on whether the origin is allowed. */
function corsHeaders(req: NextRequest, origin: string | null): Headers {
  const h = new Headers();
  if (origin && isAllowedOrigin(req, origin)) {
    h.set('Access-Control-Allow-Origin', origin);
    h.set('Access-Control-Allow-Credentials', 'true');
    h.set('Vary', 'Origin');
  }
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  return h;
}

/** Handle CORS preflight. */
export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(req, origin) });
}

/** Wrap the Better Auth handlers so CORS headers are always present. */
async function withCors(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  const origin = req.headers.get('origin');
  try {
    const res = await handler(req);
    // Merge CORS headers into whatever Better Auth returned.
    const out = new Headers(res.headers);
    const cors = corsHeaders(req, origin);
    cors.forEach((v, k) => out.set(k, v));
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  } catch (err) {
    // Log the full error server-side so we can diagnose from Vercel logs.
    // eslint-disable-next-line no-console
    console.error('[auth] handler failed:', err);
    // Surface the real error with proper CORS so the browser shows it,
    // not a generic "CORS blocked" message.
    const message = err instanceof Error ? err.message : 'Auth error';
    const stack = err instanceof Error ? err.stack : undefined;
    const headers = corsHeaders(req, origin);
    headers.set('Content-Type', 'application/json');
    return new NextResponse(
      JSON.stringify({ error: { code: 'AUTH_ERROR', message, stack } }),
      { status: 500, headers },
    );
  }
}

export const GET = (req: NextRequest) => withCors(req, (r) => baseHandler.GET(r));
export const POST = (req: NextRequest) => withCors(req, (r) => baseHandler.POST(r));