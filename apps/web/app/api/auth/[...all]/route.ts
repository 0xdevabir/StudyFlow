import { NextRequest, NextResponse } from 'next/server';
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@studyflow/auth';

// Force Node.js runtime — Better Auth + Drizzle need Node APIs (pg, dotenv).
// Vercel defaults dynamic routes to Edge which would fail at bundle time.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const baseHandler = toNextJsHandler(auth);

// Allowed origins for CORS preflight. Same-origin requests bypass this;
// cross-origin (e.g. mobile clients) need explicit headers.
function corsHeaders(req: NextRequest): Headers {
  const origin = req.headers.get('origin');
  // Allow same-origin (origin === BETTER_AUTH_URL host) and any explicitly
  // trusted app URL. Dev: http://localhost:3000 / :4000.
  const allowed = new Set<string>([
    process.env.BETTER_AUTH_URL ?? '',
    process.env.NEXT_PUBLIC_APP_URL ?? '',
    'http://localhost:3000',
    'http://localhost:4000',
  ]);
  const h = new Headers();
  if (origin && allowed.has(origin)) {
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
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/** Wrap the Better Auth handlers so CORS headers are always present. */
async function withCors(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  try {
    const res = await handler(req);
    // Merge CORS headers into whatever Better Auth returned.
    const out = new Headers(res.headers);
    const cors = corsHeaders(req);
    cors.forEach((v, k) => out.set(k, v));
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  } catch (err) {
    // Surface the real error with proper CORS so the browser shows it,
    // not a generic "CORS blocked" message.
    const message = err instanceof Error ? err.message : 'Auth error';
    const headers = corsHeaders(req);
    headers.set('Content-Type', 'application/json');
    return new NextResponse(JSON.stringify({ error: { code: 'AUTH_ERROR', message } }), {
      status: 500,
      headers,
    });
  }
}

export const GET = (req: NextRequest) => withCors(req, (r) => baseHandler.GET(r));
export const POST = (req: NextRequest) => withCors(req, (r) => baseHandler.POST(r));