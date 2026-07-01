/**
 * Drizzle client.
 *
 * - Uses `@neondatabase/serverless` HTTP driver when the connection string
 *   looks like Neon (sslmode=require & neon.tech host).
 * - Falls back to `pg` Pool for plain Postgres (local dev).
 *
 * The `db` proxy is lazy: importing this module at build time on Vercel
 * (where `DATABASE_URL` isn't set yet) won't throw — it only validates
 * and constructs the real client the first time it's used at runtime.
 */
import 'dotenv/config';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { neon as createNeonClient, neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema/index';

type DrizzleDb =
  | ReturnType<typeof drizzleHttp<typeof schema>>
  | ReturnType<typeof drizzleNode<typeof schema>>;

let _db: DrizzleDb | null = null;

function buildDb(): DrizzleDb {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. Set it in your environment (Vercel Project Settings → Environment Variables).',
    );
  }
  const isNeon = /neon\.tech|sslmode=require/.test(url);
  neonConfig.fetchConnectionCache = true;
  if (isNeon) {
    _db = drizzleHttp(createNeonClient(url), { schema });
  } else {
    _db = drizzleNode(new Pool({ connectionString: url, max: 10 }), { schema });
  }
  return _db;
}

/**
 * Lazy proxy around the Drizzle client. Every property access (e.g.
 * `db.select`, `db.insert`) calls `buildDb()` the first time, so module
 * import is safe even when `DATABASE_URL` is unset.
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_t, prop, receiver) {
    const real = buildDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export { schema };
export * from './schema/index';
export type DB = DrizzleDb;
export type DbTransaction = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;