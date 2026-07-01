/**
 * Env validation for the auth package — used by both apps/api (server)
 * and apps/web (server components).
 *
 * We parse lazily so that importing this module from a build-time context
 * (Next.js page-data collection, Vercel build) doesn't crash when env
 * vars aren't present yet. The first real server-side call to
 * `loadAuthEnv()` validates and throws a helpful error if missing.
 *
 * Production deployments (Vercel) must set DATABASE_URL, BETTER_AUTH_SECRET
 * (≥ 16 chars), and BETTER_AUTH_URL (the deployed origin). In development
 * we fall back to localhost defaults so first-boot dev stays simple.
 */
import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

const authEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, 'BETTER_AUTH_SECRET must be ≥ 16 chars'),
  BETTER_AUTH_URL: isProd
    ? z.string().url('BETTER_AUTH_URL is required in production (e.g. https://your-app.vercel.app)')
    : z.string().url().default('http://localhost:3000'),
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
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || i.code}: ${i.message}`)
      .join('\n');
    throw new Error(
      `[auth] Invalid environment variables.\n${issues}\n` +
        `Set these in your Vercel project (Settings → Environment Variables):\n` +
        `  • DATABASE_URL — your Postgres connection string\n` +
        `  • BETTER_AUTH_SECRET — ≥ 16 chars (run: openssl rand -base64 32)\n` +
        (isProd
          ? `  • BETTER_AUTH_URL — your deployed origin (e.g. https://your-app.vercel.app)`
          : `  • BETTER_AUTH_URL — optional in dev, defaults to http://localhost:3000`),
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