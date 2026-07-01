/**
 * Course + dynamic hierarchy. The hierarchy is intentionally unbounded —
 * any depth, any node "type" (module/lesson/week/...). Users define
 * their own vocabulary.
 */
import { relations } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { softDelete, timestamps, uuidPk } from '../helpers';
import { user } from './auth';
import { coursePriorityEnum, courseStatusEnum } from './enums';

export const course = pgTable(
  'courses',
  {
    id: uuidPk('id'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 80 }),
    source: varchar('source', { length: 80 }),
    url: text('url'),
    color: varchar('color', { length: 9 }),
    icon: varchar('icon', { length: 60 }),
    thumbnailUrl: text('thumbnail_url'),
    instructor: varchar('instructor', { length: 120 }),
    status: courseStatusEnum('status').notNull().default('active'),
    priority: coursePriorityEnum('priority').notNull().default('medium'),
    estimatedMinutes: integer('estimated_minutes').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    slugOwnerIdx: uniqueIndex('courses_slug_owner_uniq')
      .on(t.ownerId, sql`lower(${t.slug})`)
      .where(sql`${t.deletedAt} IS NULL`),
    ownerIdx: index('courses_owner_idx').on(t.ownerId).where(sql`${t.deletedAt} IS NULL`),
    statusIdx: index('courses_owner_status_idx')
      .on(t.ownerId, t.status)
      .where(sql`${t.deletedAt} IS NULL`),
  }),
);

export const courseHierarchy = pgTable(
  'course_hierarchy',
  {
    id: uuidPk('id'),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'), // self-ref set after table is created
    /** Materialized path. Created/maintained by trigger (see migration). */
    path: text('path').notNull().default(''),
    orderIndex: integer('order_index').notNull().default(0),
    /** Free-form: module, lesson, week, chapter, lecture, etc. */
    type: varchar('type', { length: 40 }).notNull().default('item'),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    url: text('url'),
    estimatedMinutes: integer('estimated_minutes').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    courseIdx: index('hierarchy_course_idx').on(t.courseId),
    parentIdx: index('hierarchy_parent_idx').on(t.parentId),
    orderIdx: index('hierarchy_course_parent_order_idx').on(
      t.courseId,
      t.parentId,
      t.orderIndex,
    ),
    pathIdx: index('hierarchy_path_idx').on(t.path),
    depthCheck: check('hierarchy_depth_check', sql`array_length(string_to_array(${t.path}, '.'), 1) <= 12`),
  }),
);

export const courseProgress = pgTable(
  'course_progress',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    percent: integer('percent').notNull().default(0),
    status: courseStatusEnum('status').notNull().default('active'),
    lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    totalMinutes: integer('total_minutes').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    userCourseIdx: uniqueIndex('progress_user_course_uniq').on(t.userId, t.courseId),
  }),
);

export const courseRelations = relations(course, ({ many }) => ({
  hierarchy: many(courseHierarchy),
  progress: many(courseProgress),
}));

export const hierarchyRelations = relations(courseHierarchy, ({ one, many }) => ({
  course: one(course, {
    fields: [courseHierarchy.courseId],
    references: [course.id],
  }),
  parent: one(courseHierarchy, {
    fields: [courseHierarchy.parentId],
    references: [courseHierarchy.id],
    relationName: 'hierarchy_parent',
  }),
  children: many(courseHierarchy, { relationName: 'hierarchy_parent' }),
}));
