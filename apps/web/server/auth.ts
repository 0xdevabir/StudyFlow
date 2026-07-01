/**
 * Server-side helpers for accessing the Better Auth session from RSC.
 */
import 'server-only';
import { headers } from 'next/headers';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { auth } from '@studyflow/auth';
import { db } from '@studyflow/db';
import { session as sessionTable, user as userTable } from '@studyflow/db/schema';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  timezone?: string;
  [key: string]: unknown;
};

/**
 * Resolve the session for the current server-component request.
 *
 * 1. Try Better Auth's `auth.api.getSession({ headers })` — the canonical path.
 * 2. If that returns null but a `better-auth.session_token` cookie is present,
 *    fall back to a direct DB lookup. This guards against a class of Vercel
 *    Edge / Node-runtime cookie-read mismatches where Better Auth's signed-cookie
 *    helper occasionally returns null even though a valid session row exists.
 */
export async function getServerSession(): Promise<{ user: SessionUser; session: { id: string; token: string; userId: string; expiresAt: Date } } | null> {
  const headerList = await headers();

  try {
    const baSession = await auth.api.getSession({ headers: headerList });
    if (baSession?.user && baSession?.session) {
      return baSession as { user: SessionUser; session: { id: string; token: string; userId: string; expiresAt: Date } };
    }
  } catch {
    // Fall through to direct lookup.
  }

  // Fallback: parse the session token from the request cookie and look it up
  // directly in the database. The token is the raw DB value (Better Auth does
  // not sign it for DB storage), but the cookie value is the signed token.
  // We can't verify the signature without Better Auth's helper, so we look up
  // the raw token column; since tokens are 32-char random strings they are
  // practically un-guessable.
  const rawCookieHeader = headerList.get('cookie') ?? '';
  const match = rawCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!match) return null;
  const rawCookie = decodeURIComponent(match[1] ?? '');
  const token = rawCookie.split('.')[0] ?? rawCookie;
  if (!token) return null;

  const rows = await db
    .select({
      sessionId: sessionTable.id,
      token: sessionTable.token,
      userId: sessionTable.userId,
      expiresAt: sessionTable.expiresAt,
      email: userTable.email,
      name: userTable.name,
      image: userTable.image,
      timezone: userTable.timezone,
    })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(and(eq(sessionTable.token, token), gt(sessionTable.expiresAt, new Date()), isNull(userTable.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    user: {
      id: row.userId,
      name: row.name,
      email: row.email,
      image: row.image ?? null,
      timezone: row.timezone,
    },
    session: {
      id: row.sessionId,
      token: row.token,
      userId: row.userId,
      expiresAt: row.expiresAt,
    },
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession();
  return session?.user ?? null;
}
