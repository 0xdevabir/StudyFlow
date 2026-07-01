/**
 * Single source of truth for Better Auth configuration.
 *
 * Used by:
 *   - apps/web/app/api/auth/[...all]/route.ts (Next.js handler)
 *   - apps/api/src/modules/auth/auth.routes.ts (Express mount)
 *
 * The instance is built lazily on first access. We expose it via a Proxy
 * that intercepts every property/method access and lazily builds the
 * underlying `betterAuth(...)` instance the first time anything is
 * touched. Both property reads AND function calls work.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@studyflow/db';
import * as schema from '@studyflow/db/schema';
import { loadAuthEnv } from './env.js';

let _auth: ReturnType<typeof betterAuth> | null = null;

function buildAuth() {
  if (_auth) return _auth;
  const env = loadAuthEnv();
  _auth = betterAuth({
    appName: 'StudyFlow' as const,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],

    advanced: {
      // Our schema uses Postgres `uuid` for `users.id`, `sessions.id`,
      // `accounts.id`, etc. Better Auth's default generateId() returns a
      // 32-char alphanumeric string, which would fail to insert into a uuid
      // column. Forcing `uuid` here makes Better Auth produce real UUIDs
      // that match our schema.
      database: {
        generateId: 'uuid',
      },
    },

    database: drizzleAdapter(db as never, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // dev-friendly; flip in prod
      autoSignIn: true,
      minPasswordLength: 8,
    },

    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      // In dev we just log to the console (Mailpit-friendly).
      sendVerificationEmail: async ({ user, url }) => {
        if (env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log(`\n📧 Email verification link for ${user.email}:\n${url}\n`);
          return;
        }
        // Hook your real provider here (Resend / SES / Postmark).
        // await sendViaResend(user.email, 'Verify your StudyFlow account', url);
      },
    },

    account: {
      accountLinking: { enabled: true },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30d
      updateAge: 60 * 60 * 24, // refresh once a day
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    plugins: [nextCookies()], // required for Next.js; harmless on Node mount
  }) as unknown as ReturnType<typeof betterAuth>;
  return _auth;
}

type AuthInstance = ReturnType<typeof betterAuth>;

/**
 * Lazy proxy. Every property access (`auth.handler`, `auth.api`) and every
 * function call (`auth(...)`, even though Better Auth isn't callable
 * itself, library code does this) lazily constructs the real instance
 * the first time and then forwards correctly.
 */
export const auth: AuthInstance = new Proxy(function () {} as unknown as AuthInstance, {
  get(_target, prop, _receiver) {
    const real = buildAuth();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
  has(_target, prop) {
    return prop in buildAuth();
  },
  ownKeys() {
    return Reflect.ownKeys(buildAuth());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(buildAuth(), prop);
  },
}) as AuthInstance;

export type Auth = AuthInstance;
// Eager accessor for callers that always have env present at boot
// (e.g. the Express API server which validates env on startup).
export const getAuth = buildAuth;