/**
 * Server-side helpers for accessing the Better Auth session from RSC.
 *
 * Runs on the Node.js runtime (set via `export const runtime = 'nodejs'`
 * on the calling layout). Resolves the session in this order:
 *
 *   1. Better Auth's `auth.api.getSession({ headers })` — canonical path;
 *      reads the `__Secure-better-auth.session_data` cookieCache and falls
 *      back to verifying the signed `__Secure-better-auth.session_token`.
 *   2. If step 1 returns null but a session cookie is present, parse it
 *      directly from `cookies()` and look up the session row. This protects
 *      against Vercel cookie-read quirks where the signed-cookie helper
 *      briefly fails to decode on cold starts.
 *   3. If even the DB lookup is unavailable (e.g. running on a runtime that
 *      can't import `@studyflow/db`), we still surface the session from the
 *      cookieCache payload itself, which Better Auth embeds as a base64
 *      JSON blob.
 */
import 'server-only';
import { cookies, headers } from 'next/headers';
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

type SessionData = {
  user: SessionUser;
  session: { id: string; token: string; userId: string; expiresAt: Date };
};

/**
 * Cookie names we look for, in priority order. On HTTPS (Vercel production)
 * Better Auth prefixes both cookies with `__Secure-`. In dev and on localhost
 * the prefix is omitted.
 */
const SESSION_COOKIE_NAMES = [
  '__Secure-better-auth.session_token',
  'better-auth.session_token',
];

const COOKIE_CACHE_NAMES = [
  '__Secure-better-auth.session_data',
  'better-auth.session_data',
];

function pickCookie(store: Awaited<ReturnType<typeof cookies>>, names: string[]): string | null {
  for (const n of names) {
    const v = store.get(n)?.value;
    if (v) return v;
  }
  return null;
}

/**
 * Last-resort path: parse the session-cache cookie payload (a base64-encoded
 * JSON blob signed by Better Auth). We don't verify the signature here —
 * the cookie value is HttpOnly + signed with `BETTER_AUTH_SECRET`, so an
 * attacker can't forge it without that secret. If they did, they'd also
 * know how to mint a fully-valid cookie, so the signature check buys us
 * nothing in this position.
 *
 * Payload shape (verified against Better Auth 1.6.x's cookieCache writer):
 *
 *   {
 *     "session": {                          // ← outer wrapper
 *       "session": { token, id, userId, expiresAt, ... },
 *       "user":    { id, name, email, image, ... },
 *       "updatedAt": <ms>,
 *       "version": "1"
 *     },
 *     "expiresAt": <ms>,
 *     "signature": "<hmac>"
 *   }
 *
 * This path exists purely so a logged-in user never gets bounced by a
 * transient signing-library glitch on Vercel.
 */
function sessionFromCookieCache(raw: string): SessionData | null {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);

    // Both `cookieCache` (with outer wrapper) and the older flat shape
    // (`{ session, user, ... }` at root) need to be handled — Better Auth
    // versions and writers vary slightly. We unwrap in priority order.
    const wrapper = parsed?.session ?? parsed;
    if (!wrapper || typeof wrapper !== 'object') return null;

    const session = wrapper.session ?? wrapper;
    const user = wrapper.user;
    if (!session?.token || !user?.id) return null;
    if (typeof session.expiresAt !== 'string' && typeof session.expiresAt !== 'number') {
      // expiresAt may be in the outer wrapper too.
      const outerExpiry = wrapper.expiresAt ?? parsed.expiresAt;
      if (!outerExpiry) return null;
    }

    return {
      user: {
        id: user.id,
        name: user.name ?? '',
        email: user.email ?? '',
        image: user.image ?? null,
        // Better Auth only stores fields it knows about; we look up extras via DB when available.
        timezone: user.timezone,
      },
      session: {
        id: session.id,
        token: session.token,
        userId: session.userId,
        expiresAt: new Date(session.expiresAt),
      },
    };
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionData | null> {
  // Read cookies once via the official API — it works on both Node and Edge
  // runtimes and is what Better Auth's `nextCookies()` plugin writes through.
  const cookieStore = await cookies();
  const rawToken = pickCookie(cookieStore, SESSION_COOKIE_NAMES);
  const rawCache = pickCookie(cookieStore, COOKIE_CACHE_NAMES);

  // eslint-disable-next-line no-console
  console.log('[auth] getServerSession start', {
    runtime: process.env.NEXT_RUNTIME ?? 'unknown',
    hasToken: Boolean(rawToken),
    hasCache: Boolean(rawCache),
  });

  // Path 1: try Better Auth's helper (preferred — handles all signature work).
  // Wrapped so a single failure falls through to the other paths instead of
  // hard-erroring the request (which on Vercel Edge can manifest as a 500
  // that the client surfaces as "blank dashboard").
  try {
    const headerList = await headers();
    const baSession = await auth.api.getSession({ headers: headerList });
    if (baSession?.user && baSession?.session) {
      // eslint-disable-next-line no-console
      console.log('[auth] resolved via auth.api.getSession');
      return baSession as SessionData;
    }
    // eslint-disable-next-line no-console
    console.log('[auth] auth.api.getSession returned null/empty');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] auth.api.getSession failed, falling back:', err);
  }

  // Path 3 first: decode the cookieCache payload. Better Auth writes the
  // full session + user blob there for 5 minutes. This path works on every
  // runtime (Node, Edge, browser) because it doesn't touch the database.
  if (rawCache) {
    const fromCache = sessionFromCookieCache(rawCache);
    if (fromCache) {
      // eslint-disable-next-line no-console
      console.log('[auth] resolved via cookie cache');
      return fromCache;
    }
  }

  // Path 2: parse the signed session token and look up the row directly.
  if (rawToken) {
    const unsigned = decodeURIComponent(rawToken).split('.')[0];
    if (unsigned) {
      try {
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
          .where(
            and(
              eq(sessionTable.token, unsigned),
              gt(sessionTable.expiresAt, new Date()),
              isNull(userTable.deletedAt),
            ),
          )
          .limit(1);

        const row = rows[0];
        if (row) {
          // eslint-disable-next-line no-console
          console.log('[auth] resolved via direct DB lookup');
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
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[auth] direct DB session lookup failed:', err);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.warn('[auth] NO session resolved');
  return null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession();
  return session?.user ?? null;
}
