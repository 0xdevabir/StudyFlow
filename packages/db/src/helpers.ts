import { sql } from 'drizzle-orm';
import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * uuid column with `gen_random_uuid()` default.
 * @see https://www.postgresql.org/docs/current/functions-uuid-ossp.html
 */
export const uuidPk = (name = 'id') =>
  uuid(name)
    .primaryKey()
    .default(sql`gen_random_uuid()`);

/** created_at / updated_at columns. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
};

/** Single nullable `deleted_at` column for soft-delete. */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

/**
 * `jsonb` typed column. Use a structural generic to keep things typed.
 */
export const jsonb = <T = unknown>(name: string) =>
  customType<{ data: T; driverData: unknown }>({
    dataType() {
      return 'jsonb';
    },
  })(name);
