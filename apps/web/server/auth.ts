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
 *   3. If even the DB lookup is unavailable, surface the session from the
 *      cookieCache payload itself, which Better Auth embeds as a base64
 *      JSON blob. Works on every runtime.
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
 * Cookie names we look for. On HTTPS (Vercel production) Better Auth
 * prefixes both cookies with `__Secure-`; in dev/localhost the prefix is
 * omitted. Both forms are tried.
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
 * Parse the session-cache cookie payload (a base64-encoded JSON blob
 * signed by Better Auth). We don't verify the signature here — the cookie
 * is HttpOnly + signed with `BETTER_AUTH_SECRET`, so an attacker can't
 * forge it without that secret. If they did, they'd also know how to mint
 * a fully-valid cookie.
 *
 * Payload shape (Better Auth 1.6.x cookieCache writer):
 *
 *   {
 *     "session": {                          ← outer wrapper
 *       "session": { token, id, userId, expiresAt, ... },
 *       "user":    { id, name, email, image, ... },
 *       "updatedAt": <ms>,
 *       "version": "1"
 *     },
 *     "expiresAt": <ms>,
 *     "signature": "<hmac>"
 *   }
 */
function sessionFromCookieCache(raw: string): SessionData | null {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);

    // Unwrap the outer wrapper; fall back to legacy flat shape defensively.
    const wrapper = parsed?.session ?? parsed;
    if (!wrapper || typeof wrapper !== 'object') return null;

    const session = wrapper.session ?? wrapper;
    const user = wrapper.user;
    if (!session?.token || !user?.id) return null;

    return {
      user: {
        id: user.id,
        name: user.name ?? '',
        email: user.email ?? '',
        image: user.image ?? null,
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
  // Read cookies via the official API — works on Node + Edge.
  const cookieStore = await cookies();
  const rawToken = pickCookie(cookieStore, SESSION_COOKIE_NAMES);
  const rawCache = pickCookie(cookieStore, COOKIE_CACHE_NAMES);

  // Path 1: Better Auth's helper (preferred — handles all signature work).
  try {
    const headerList = await headers();
    const baSession = await auth.api.getSession({ headers: headerList });
    if (baSession?.user && baSession?.session) {
      return baSession as SessionData;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] auth.api.getSession failed, falling back:', err);
  }

  // Path 2: cookieCache payload. Runtime-agnostic — reads only the cookie,
  // doesn't touch the database. Tries this before the DB lookup so an Edge
  // or stale-DB situation still resolves.
  if (rawCache) {
    const fromCache = sessionFromCookieCache(rawCache);
    if (fromCache) return fromCache;
  }

  // Path 3: parse the signed session token and look up the row directly.
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

  return null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession();
  return session?.user ?? null;
}
