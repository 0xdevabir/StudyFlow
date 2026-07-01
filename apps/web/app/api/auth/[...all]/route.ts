import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@studyflow/auth';

// Force Node.js runtime — Better Auth + Drizzle need Node APIs (pg, dotenv).
// Vercel defaults dynamic routes to Edge which would fail at bundle time.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, POST } = toNextJsHandler(auth);
