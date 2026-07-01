/**
 * Browser-side Better Auth client. Use `authClient.signIn.email(...)` etc.
 *
 * `baseURL` is left undefined on purpose — Better Auth then resolves it to
 * `window.location.origin` at runtime, which means the same bundle works on
 * localhost, the Vercel deployment, or any future preview URL without
 * rebuilding. Hardcoding the URL via `NEXT_PUBLIC_APP_URL` at build time
 * breaks every environment that wasn't baked in.
 */
import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<{ user: { timezone?: string } }>()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;