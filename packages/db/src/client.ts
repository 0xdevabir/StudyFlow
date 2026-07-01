/**
 * Drizzle client.
 *
 * - Uses `@neondatabase/serverless` HTTP driver when the connection string
 *   looks like Neon (sslmode=require & neon.tech host).
 * - Falls back to `pg` Pool for plain Postgres (local dev).
 *
 * The result is a single `db` import used by every consumer.
 */
import 'dotenv/config';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { neon as createNeonClient, neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema/index.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is required. Did you copy .env.example to .env?',
  );
}

const isNeon = /neon\.tech|sslmode=require/.test(url);
neonConfig.fetchConnectionCache = true;

let _db: ReturnType<typeof drizzleHttp<typeof schema>> | ReturnType<typeof drizzleNode<typeof schema>>;
if (isNeon) {
  const sql = createNeonClient(url);
  _db = drizzleHttp(sql, { schema });
} else {
  const pool = new Pool({ connectionString: url, max: 10 });
  _db = drizzleNode(pool, { schema });
}

export const db = _db;
export { schema };
export * from './schema/index.js';
export type DB = typeof db;
export type DbTransaction = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;