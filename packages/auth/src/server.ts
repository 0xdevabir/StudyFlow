/**
 * Single source of truth for Better Auth configuration.
 *
 * Used by:
 *   - apps/web/app/api/auth/[...all]/route.ts (Next.js handler)
 *   - apps/api/src/modules/auth/auth.routes.ts (Express mount)
 *
 * Keep this file the *only* place that constructs `auth`. Both apps then
 * call `auth.handler` (Node) or `toNextJsHandler(auth)` (Next).
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@studyflow/db';
import * as schema from '@studyflow/db/schema';
import { authEnv } from './env.js';

export const auth = betterAuth({
  appName: 'StudyFlow',
  baseURL: authEnv.BETTER_AUTH_URL,
  secret: authEnv.BETTER_AUTH_SECRET,
  trustedOrigins: [authEnv.BETTER_AUTH_URL],

  database: drizzleAdapter(db, {
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
    ...(authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: authEnv.GOOGLE_CLIENT_ID,
            clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // In dev we just log to the console (Mailpit-friendly).
    sendVerificationEmail: async ({ user, url }) => {
      if (authEnv.NODE_ENV !== 'production') {
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
});

export type Auth = typeof auth;