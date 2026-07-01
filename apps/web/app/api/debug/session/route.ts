/**
 * Debug endpoint: shows what Better Auth sees for the current request.
 * Useful for diagnosing "loops back to login" issues on Vercel.
 *
 * Returns:
 *   - env (BETTER_AUTH_URL, NODE_ENV) — redacted
 *   - cookie names present on the request
 *   - the resolved session from `auth.api.getSession({ headers })`
 *   - the resolved session from direct DB lookup (fallback)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { auth } from '@studyflow/auth';
import { db } from '@studyflow/db';
import { session, user } from '@studyflow/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieNames = req.cookies.getAll().map((c) => c.name);
  // Better Auth prefixes session cookies with `__Secure-` in production
  // (HTTPS). On localhost it uses the bare name. Look for both.
  const baSessionToken =
    req.cookies.get('__Secure-better-auth.session_token')?.value ??
    req.cookies.get('better-auth.session_token')?.value ??
    null;
  const baSessionData =
    req.cookies.get('__Secure-better-auth.session_data')?.value ??
    req.cookies.get('better-auth.session_data')?.value ??
    null;

  let betterAuthSession: unknown = null;
  let betterAuthError: string | null = null;
  try {
    betterAuthSession = await auth.api.getSession({ headers: req.headers });
  } catch (err) {
    betterAuthError = err instanceof Error ? err.message : String(err);
  }

  let directLookup: { userId: string; email: string; name: string } | null = null;
  let directError: string | null = null;
  if (baSessionToken) {
    try {
      // Strip the signature: cookie value is "<token>.<signature>".
      const unsigned = (baSessionToken.split('.')[0] ?? '').trim();
      if (unsigned) {
        const rows = await db
          .select({
            sessionId: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            email: user.email,
            name: user.name,
          })
          .from(session)
          .innerJoin(user, eq(session.userId, user.id))
          .where(and(eq(session.token, unsigned), isNull(user.deletedAt)))
          .limit(1);
        const row = rows[0];
        if (row && row.expiresAt > new Date()) {
          directLookup = { userId: row.userId, email: row.email, name: row.name };
        }
      }
    } catch (err) {
      directError = err instanceof Error ? err.message : String(err);
    }
  }

  // Also report what the cookieCache blob contains, so we can verify the
  // RSC-side fallback parsing matches what Better Auth actually writes.
  let cachePreview: { ok: boolean; token?: string; userId?: string; signaturePresent?: boolean; error?: string } | null = null;
  if (baSessionData) {
    try {
      const decoded = JSON.parse(Buffer.from(baSessionData, 'base64').toString('utf8'));
      const wrapper = decoded?.session ?? decoded;
      cachePreview = {
        ok: Boolean(wrapper?.session?.token && wrapper?.user?.id),
        token: wrapper?.session?.token,
        userId: wrapper?.user?.id ?? wrapper?.session?.userId,
        signaturePresent: Boolean(decoded?.signature),
      };
    } catch (err) {
      cachePreview = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      hasDb: Boolean(process.env.DATABASE_URL),
    },
    cookies: cookieNames,
    baSessionTokenPresent: Boolean(baSessionToken),
    baSessionDataPresent: Boolean(baSessionData),
    betterAuthSession,
    betterAuthError,
    directLookup,
    directError,
    cachePreview,
  });
}