import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * PostgreSQL enums. Mirrored as TS unions in `@studyflow/shared`.
 */

export const courseStatusEnum = pgEnum('course_status', [
  'active',
  'paused',
  'completed',
  'archived',
]);

export const coursePriorityEnum = pgEnum('course_priority', [
  'low',
  'medium',
  'high',
  'critical',
]);

export const taskTypeEnum = pgEnum('task_type', [
  'assignment',
  'quiz',
  'practice',
  'revision',
  'exam',
  'custom',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const goalPeriodEnum = pgEnum('goal_period', [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom',
]);

export const goalMetricEnum = pgEnum('goal_metric', [
  'minutes',
  'tasks',
  'lessons',
  'pages',
  'custom',
]);

export const habitFrequencyEnum = pgEnum('habit_frequency', [
  'daily',
  'weekly',
  'weekdays',
  'custom',
]);

export const revisionIntervalUnitEnum = pgEnum('revision_interval_unit', [
  'day',
  'week',
  'month',
  'custom',
]);

export const attachmentKindEnum = pgEnum('attachment_kind', [
  'image',
  'video',
  'audio',
  'pdf',
  'file',
  'link',
]);

export const bookmarkKindEnum = pgEnum('bookmark_kind', [
  'video',
  'website',
  'pdf',
  'article',
  'github',
  'other',
]);

export const reminderKindEnum = pgEnum('reminder_kind', [
  'deadline',
  'goal',
  'revision',
  'study',
  'custom',
]);

export const activityKindEnum = pgEnum('activity_kind', [
  'create',
  'update',
  'delete',
  'complete',
  'start',
  'end',
  'login',
  'other',
]);

export const notificationKindEnum = pgEnum('notification_kind', [
  'deadline',
  'goal',
  'revision',
  'reminder',
  'system',
]);

export const themeEnum = pgEnum('theme', ['light', 'dark', 'system']);

export const memberRoleEnum = pgEnum('member_role', [
  'owner',
  'admin',
  'member',
  'viewer',
]);