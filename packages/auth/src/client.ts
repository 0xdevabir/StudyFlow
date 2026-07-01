/**
 * Browser-side Better Auth client. Use `authClient.signIn.email(...)` etc.
 * Build baseURL from `NEXT_PUBLIC_APP_URL` so the bundle is portable.
 */
import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // Inferred at build time for the web app.
  baseURL:
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) ||
    'http://localhost:3000',
  plugins: [inferAdditionalFields<{ user: { timezone?: string } }>()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;