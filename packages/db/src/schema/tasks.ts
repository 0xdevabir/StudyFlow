import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { softDelete, timestamps, uuidPk } from '../helpers';
import { user } from './auth';
import { course, courseHierarchy } from './courses';
import { taskPriorityEnum, taskStatusEnum, taskTypeEnum } from './enums';

export const task = pgTable(
  'tasks',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => course.id, { onDelete: 'set null' }),
    hierarchyId: uuid('hierarchy_id').references(() => courseHierarchy.id, {
      onDelete: 'set null',
    }),
    parentTaskId: uuid('parent_task_id'),
    type: taskTypeEnum('type').notNull().default('custom'),
    title: varchar('title', { length: 240 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('pending'),
    priority: taskPriorityEnum('priority').notNull().default('medium'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    estimateMinutes: integer('estimate_minutes').notNull().default(0),
    actualMinutes: integer('actual_minutes').notNull().default(0),
    recurrenceRrule: text('recurrence_rrule'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userStatusDueIdx: index('tasks_user_status_due_idx')
      .on(t.userId, t.status, t.dueAt)
      .where(sql`${t.deletedAt} IS NULL`),
    courseIdx: index('tasks_course_idx').on(t.courseId),
    hierarchyIdx: index('tasks_hierarchy_idx').on(t.hierarchyId),
  }),
);

export const taskRelations = relations(task, ({ one, many }) => ({
  user: one(user, { fields: [task.userId], references: [user.id] }),
  course: one(course, { fields: [task.courseId], references: [course.id] }),
  hierarchy: one(courseHierarchy, {
    fields: [task.hierarchyId],
    references: [courseHierarchy.id],
  }),
  parent: one(task, {
    fields: [task.parentTaskId],
    references: [task.id],
    relationName: 'task_parent',
  }),
  children: many(task, { relationName: 'task_parent' }),
}));