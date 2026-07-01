/**
 * Env validation for the auth package — used by both apps/api (server)
 * and apps/web (server components). Validates once at import time.
 */
import { z } from 'zod';

const authEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET must be ≥ 16 chars'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const authEnv = authEnvSchema.parse(process.env);
export type AuthEnv = z.infer<typeof authEnvSchema>;