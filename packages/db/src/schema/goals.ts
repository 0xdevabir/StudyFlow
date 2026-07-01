import { relations } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { softDelete, timestamps, uuidPk } from '../helpers';
import { user } from './auth';
import { course, courseHierarchy } from './courses';
import {
  goalMetricEnum,
  goalPeriodEnum,
  habitFrequencyEnum,
  revisionIntervalUnitEnum,
} from './enums';

export const goal = pgTable(
  'goals',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    period: goalPeriodEnum('period').notNull().default('daily'),
    metric: goalMetricEnum('metric').notNull().default('minutes'),
    target: integer('target').notNull().default(0),
    courseId: uuid('course_id').references(() => course.id, { onDelete: 'set null' }),
    hierarchyId: uuid('hierarchy_id').references(() => courseHierarchy.id, {
      onDelete: 'set null',
    }),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userPeriodIdx: index('goals_user_period_idx').on(t.userId, t.period),
  }),
);

export const habit = pgTable(
  'habits',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    icon: varchar('icon', { length: 60 }),
    color: varchar('color', { length: 9 }),
    frequency: habitFrequencyEnum('frequency').notNull().default('daily'),
    targetPerPeriod: integer('target_per_period').notNull().default(1),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userIdx: index('habits_user_idx').on(t.userId),
  }),
);

export const habitLog = pgTable(
  'habit_logs',
  {
    id: uuidPk('id'),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habit.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    logDate: date('log_date').notNull(),
    value: integer('value').notNull().default(1),
    note: text('note'),
    ...timestamps,
  },
  (t) => ({
    uniqueDay: uniqueIndex('habit_logs_day_uniq').on(t.habitId, t.logDate),
    userDateIdx: index('habit_logs_user_date_idx').on(t.userId, t.logDate),
  }),
);

export const revision = pgTable(
  'revisions',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => course.id, { onDelete: 'set null' }),
    hierarchyId: uuid('hierarchy_id').references(() => courseHierarchy.id, {
      onDelete: 'set null',
    }),
    topic: varchar('topic', { length: 240 }).notNull(),
    intervalUnit: revisionIntervalUnitEnum('interval_unit').notNull().default('day'),
    intervalValue: integer('interval_value').notNull().default(1),
    nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    repetitions: integer('repetitions').notNull().default(0),
    ease: real('ease').notNull().default(2.5),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userNextIdx: index('revisions_user_next_idx').on(t.userId, t.nextReviewAt),
    easeCheck: check('revisions_ease_check', sql`${t.ease} > 0`),
  }),
);

export const goalRelations = relations(goal, ({ one }) => ({
  user: one(user, { fields: [goal.userId], references: [user.id] }),
  course: one(course, { fields: [goal.courseId], references: [course.id] }),
  hierarchy: one(courseHierarchy, {
    fields: [goal.hierarchyId],
    references: [courseHierarchy.id],
  }),
}));

export const habitRelations = relations(habit, ({ many }) => ({
  logs: many(habitLog),
}));

export const habitLogRelations = relations(habitLog, ({ one }) => ({
  habit: one(habit, { fields: [habitLog.habitId], references: [habit.id] }),
  user: one(user, { fields: [habitLog.userId], references: [user.id] }),
}));