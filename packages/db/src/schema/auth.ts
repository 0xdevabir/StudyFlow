/**
 * Better Auth canonical tables. Layout matches the Drizzle adapter so we
 * share one schema across auth and the rest of the app.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { softDelete, timestamps, uuidPk } from '../helpers.js';

export const user = pgTable(
  'users',
  {
    id: uuidPk('id'),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    timezone: text('timezone').notNull().default('UTC'),
    locale: text('locale').notNull().default('en'),
    role: text('role').notNull().default('member'),
    isDisabled: boolean('is_disabled').notNull().default(false),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_uniq').on(sql`lower(${t.email})`).where(sql`${t.deletedAt} IS NULL`),
  }),
);

export const session = pgTable('sessions', {
  id: uuidPk('id'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  ...timestamps,
});

export const account = pgTable('accounts', {
  id: uuidPk('id'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  // Better Auth stores credentials and OAuth tokens here.
  password: text('password'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  ...timestamps,
});

export const verification = pgTable('verifications', {
  id: uuidPk('id'),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
});