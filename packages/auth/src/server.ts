/**
 * Single source of truth for Better Auth configuration.
 *
 * Used by:
 *   - apps/web/app/api/auth/[...all]/route.ts (Next.js handler)
 *   - apps/api/src/modules/auth/auth.routes.ts (Express mount)
 *
 * The `auth` instance is lazy so importing this module during Vercel's
 * build/collect phase (when env vars are not yet injected) doesn't crash.
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

/**
 * Lazy proxy. `.api.getSession(...)`, `.handler`, etc. all defer to the
 * real instance, so simply importing this module is safe.
 */
export const auth: ReturnType<typeof betterAuth> = new Proxy(
  {} as ReturnType<typeof betterAuth>,
  {
    get(_t, prop) {
      const real = buildAuth();
      const value = Reflect.get(real, prop, real);
      return typeof value === 'function' ? value.bind(real) : value;
    },
  },
) as ReturnType<typeof betterAuth>;

export type Auth = ReturnType<typeof betterAuth>;
// Re-export the builder for callers that need eager access (e.g. the
// Express mount which always runs with env present).
export const getAuth = buildAuth;