import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { softDelete, timestamps, uuidPk } from '../helpers';
import { user } from './auth';
import {
  activityKindEnum,
  memberRoleEnum,
  notificationKindEnum,
  themeEnum,
} from './enums';

export const tag = pgTable(
  'tags',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 40 }).notNull(),
    color: varchar('color', { length: 9 }),
    ...timestamps,
  },
  (t) => ({
    uniqueName: uniqueIndex('tags_user_name_uniq').on(
      t.userId,
      sql`lower(${t.name})`,
    ),
  }),
);

export const taggable = pgTable(
  'taggables',
  {
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
    targetTable: varchar('target_table', { length: 60 }).notNull(),
    targetId: uuid('target_id').notNull(),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tagId, t.targetTable, t.targetId] }),
    targetIdx: index('taggables_target_idx').on(t.targetTable, t.targetId),
  }),
);

export const activityLog = pgTable(
  'activity_logs',
  {
    id: uuidPk('id'),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    kind: activityKindEnum('kind').notNull().default('other'),
    targetTable: varchar('target_table', { length: 60 }),
    targetId: uuid('target_id'),
    payload: jsonb('payload'),
    ip: varchar('ip', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userKindIdx: index('activity_user_kind_idx').on(t.userId, t.kind, t.createdAt),
  }),
);

export const notification = pgTable(
  'notifications',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: notificationKindEnum('kind').notNull().default('system'),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body'),
    linkUrl: text('link_url'),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userReadIdx: index('notifications_user_read_idx').on(t.userId, t.readAt),
  }),
);

export const settings = pgTable('settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  theme: themeEnum('theme').notNull().default('system'),
  accent: varchar('accent', { length: 9 }),
  studyMinutesGoal: integer('study_minutes_goal').notNull().default(120),
  dailyReminderTime: time('daily_reminder_time'),
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  timezone: varchar('timezone', { length: 60 }).notNull().default('UTC'),
  weekStartsOn: integer('week_starts_on').notNull().default(1),
  notifyDeadline: boolean('notify_deadline').notNull().default(true),
  notifyGoal: boolean('notify_goal').notNull().default(true),
  notifyRevision: boolean('notify_revision').notNull().default(true),
  notifyDaily: boolean('notify_daily').notNull().default(false),
  ...timestamps,
});

export const analyticsSnapshot = pgTable(
  'analytics_snapshots',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    bucketDate: date('bucket_date').notNull(),
    kind: varchar('kind', { length: 60 }).notNull(),
    payload: jsonb('payload').notNull(),
    ...timestamps,
  },
  (t) => ({
    uniq: uniqueIndex('analytics_snapshots_user_date_kind').on(
      t.userId,
      t.bucketDate,
      t.kind,
    ),
  }),
);

export const workspace = pgTable('workspaces', {
  id: uuidPk('id'),
  name: varchar('name', { length: 120 }).notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  description: text('description'),
  ...timestamps,
  ...softDelete,
});

export const workspaceMember = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('member'),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
  }),
);

export const tagRelations = relations(tag, ({ many }) => ({
  links: many(taggable),
}));

export const activityRelations = relations(activityLog, ({ one }) => ({
  user: one(user, { fields: [activityLog.userId], references: [user.id] }),
}));