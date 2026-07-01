import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { softDelete, timestamps, uuidPk } from '../helpers';
import { user } from './auth';
import { course, courseHierarchy } from './courses';
import { reminderKindEnum } from './enums';

export const studySession = pgTable(
  'study_sessions',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => course.id, { onDelete: 'set null' }),
    hierarchyId: uuid('hierarchy_id').references(() => courseHierarchy.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    productivity: integer('productivity'),
    focusScore: integer('focus_score'),
    mood: varchar('mood', { length: 24 }),
    notes: text('notes'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userStartedIdx: index('sessions_user_started_idx')
      .on(t.userId, sql`${t.startedAt} DESC`)
      .where(sql`${t.deletedAt} IS NULL`),
  }),
);

export const reminder = pgTable(
  'reminders',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: reminderKindEnum('kind').notNull().default('custom'),
    targetTable: varchar('target_table', { length: 60 }),
    targetId: uuid('target_id'),
    fireAt: timestamp('fire_at', { withTimezone: true }).notNull(),
    repeatRule: text('repeat_rule'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userFireIdx: index('reminders_user_fire_idx').on(t.userId, t.fireAt),
  }),
);

export const sessionRelations = relations(studySession, ({ one }) => ({
  user: one(user, { fields: [studySession.userId], references: [user.id] }),
  course: one(course, { fields: [studySession.courseId], references: [course.id] }),
  hierarchy: one(courseHierarchy, {
    fields: [studySession.hierarchyId],
    references: [courseHierarchy.id],
  }),
}));