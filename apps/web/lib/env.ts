/**
 * Web-side env (NEXT_PUBLIC_* only). Validate to prevent typos.
 *
 * `NEXT_PUBLIC_API_URL` defaults to an empty string, which makes the API
 * client use **relative** URLs (e.g. `/api/v1/courses` resolves against the
 * current origin). That keeps the same bundle working in localhost, on
 * Vercel, and on any preview URL without rebuilding. If you want the web
 * to call a separately-deployed API server instead, set the env var
 * explicitly to its full origin (e.g. `https://api.studyflow.app`).
 *
 * `NEXT_PUBLIC_APP_URL` is left as a localhost default so first-boot dev
 * stays simple. Production should set it to the deployed origin — Better
 * Auth uses it (via the server) to construct callback URLs.
 */
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().default(''),
});

export const env = schema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
