import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { softDelete, timestamps, uuidPk } from '../helpers';
import { user } from './auth';
import { course, courseHierarchy } from './courses';
import { attachmentKindEnum, bookmarkKindEnum } from './enums';
import { task } from './tasks';
import { studySession } from './sessions';

export const note = pgTable(
  'notes',
  {
    id: uuidPk('id'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => course.id, { onDelete: 'set null' }),
    hierarchyId: uuid('hierarchy_id').references(() => courseHierarchy.id, {
      onDelete: 'set null',
    }),
    taskId: uuid('task_id').references(() => task.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => studySession.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 240 }).notNull(),
    bodyMd: text('body_md').notNull().default(''),
    bodyHtml: text('body_html'),
    isPinned: boolean('is_pinned').notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    ownerIdx: index('notes_owner_idx').on(t.ownerId),
  }),
);

export const bookmark = pgTable(
  'bookmarks',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: bookmarkKindEnum('kind').notNull().default('other'),
    url: text('url').notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    courseId: uuid('course_id').references(() => course.id, { onDelete: 'set null' }),
    hierarchyId: uuid('hierarchy_id').references(() => courseHierarchy.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userIdx: index('bookmarks_user_idx').on(t.userId),
  }),
);

export const resource = pgTable(
  'resources',
  {
    id: uuidPk('id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: bookmarkKindEnum('kind').notNull().default('other'),
    name: varchar('name', { length: 200 }).notNull(),
    externalUrl: text('external_url'),
    fileKey: text('file_key'),
    mime: varchar('mime', { length: 120 }),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    userIdx: index('resources_user_idx').on(t.userId),
  }),
);

export const attachment = pgTable(
  'attachments',
  {
    id: uuidPk('id'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    attachableTable: varchar('attachable_table', { length: 60 }).notNull(),
    attachableId: uuid('attachable_id').notNull(),
    kind: attachmentKindEnum('kind').notNull().default('file'),
    fileKey: text('file_key').notNull(),
    originalName: varchar('original_name', { length: 240 }).notNull(),
    mime: varchar('mime', { length: 120 }),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    attachableIdx: index('attachments_target_idx').on(
      t.attachableTable,
      t.attachableId,
    ),
  }),
);

export const noteRelations = relations(note, ({ one }) => ({
  owner: one(user, { fields: [note.ownerId], references: [user.id] }),
  course: one(course, { fields: [note.courseId], references: [course.id] }),
  hierarchy: one(courseHierarchy, {
    fields: [note.hierarchyId],
    references: [courseHierarchy.id],
  }),
  task: one(task, { fields: [note.taskId], references: [task.id] }),
  session: one(studySession, { fields: [note.sessionId], references: [studySession.id] }),
}));