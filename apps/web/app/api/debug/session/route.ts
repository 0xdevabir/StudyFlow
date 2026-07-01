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
        .where(and(eq(session.token, baSessionToken), isNull(user.deletedAt)))
        .limit(1);
      const row = rows[0];
      if (row && row.expiresAt > new Date()) {
        directLookup = { userId: row.userId, email: row.email, name: row.name };
      }
    } catch (err) {
      directError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      hasDb: Boolean(process.env.DATABASE_URL),
    },
    cookies: cookieNames,
    baSessionTokenPresent: Boolean(baSessionToken),
    betterAuthSession,
    betterAuthError,
    directLookup,
    directError,
  });
}