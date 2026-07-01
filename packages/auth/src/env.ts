/**
 * Env validation for the auth package — used by both apps/api (server)
 * and apps/web (server components).
 *
 * We parse lazily so that importing this module from a build-time context
 * (Next.js page-data collection, Vercel build) doesn't crash when env
 * vars aren't present yet. The first real server-side call to
 * `loadAuthEnv()` validates and throws a helpful error if missing.
 */
import { z } from 'zod';

const authEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET must be ≥ 16 chars'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

type AuthEnv = z.infer<typeof authEnvSchema>;

let cached: AuthEnv | undefined;

/**
 * Lazily resolve & validate the auth env. Caches the parsed result so we
 * only do the work once per process. Throws if required vars are missing.
 */
export function loadAuthEnv(): AuthEnv {
  if (cached) return cached;
  const parsed = authEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `${i.path.join('.') || i.code}`).join(', ');
    throw new Error(
      `[auth] Invalid environment variables: ${missing}. ` +
        `Set DATABASE_URL, BETTER_AUTH_SECRET (≥ 16 chars), and BETTER_AUTH_URL on Vercel.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/**
 * Direct, eager export for the API server where env vars are guaranteed
 * to exist at process boot. Use `loadAuthEnv()` from code paths that may
 * execute during build/collect time.
 */
export const authEnv = new Proxy({} as AuthEnv, {
  get(_t, prop) {
    return loadAuthEnv()[prop as keyof AuthEnv];
  },
});

export type { AuthEnv };