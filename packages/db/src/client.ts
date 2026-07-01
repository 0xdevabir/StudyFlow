/**
 * Drizzle client.
 *
 * - Uses `@neondatabase/serverless` HTTP driver when NEON is enabled OR when
 *   the connection string looks like Neon (sslmode=require & ep-… host).
 * - Falls back to `pg` Pool for plain Postgres (local dev).
 *
 * The result is a single `db` import used by every consumer.
 */
import 'dotenv/config';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is required. Did you copy .env.example to .env?',
  );
}

const looksLikeNeon = /neon\.tech|sslmode=require/.test(url);

if (looksLikeNeon) {
  // Neon requires fetch + websocket shim in Node 18/20 (no node-fetch).
  neonConfig.fetchConnectionCache = true;
  const sql = neon(url);
  export const db = drizzleHttp({ client: sql, schema });
} else {
  const pool = new Pool({ connectionString: url, max: 10 });
  export const db = drizzleNode({ client: pool, schema });
}

export { schema };
export * from './schema/index.js';
export type DB = typeof db;