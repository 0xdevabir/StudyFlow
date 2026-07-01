/**
 * Domain enums shared between API, Web, and DB.
 * The DB enums are mirrored as TS unions for runtime use.
 */

export const CourseStatus = {
  active: 'active',
  paused: 'paused',
  completed: 'completed',
  archived: 'archived',
} as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const CoursePriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
} as const;
export type CoursePriority = (typeof CoursePriority)[keyof typeof CoursePriority];

export const TaskType = {
  assignment: 'assignment',
  quiz: 'quiz',
  practice: 'practice',
  revision: 'revision',
  exam: 'exam',
  custom: 'custom',
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskStatus = {
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const GoalPeriod = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
  custom: 'custom',
} as const;
export type GoalPeriod = (typeof GoalPeriod)[keyof typeof GoalPeriod];

export const GoalMetric = {
  minutes: 'minutes',
  tasks: 'tasks',
  lessons: 'lessons',
  pages: 'pages',
  custom: 'custom',
} as const;
export type GoalMetric = (typeof GoalMetric)[keyof typeof GoalMetric];

export const HabitFrequency = {
  daily: 'daily',
  weekly: 'weekly',
  weekdays: 'weekdays',
  custom: 'custom',
} as const;
export type HabitFrequency = (typeof HabitFrequency)[keyof typeof HabitFrequency];

export const RevisionIntervalUnit = {
  day: 'day',
  week: 'week',
  month: 'month',
  custom: 'custom',
} as const;
export type RevisionIntervalUnit =
  (typeof RevisionIntervalUnit)[keyof typeof RevisionIntervalUnit];

export const AttachmentKind = {
  image: 'image',
  video: 'video',
  audio: 'audio',
  pdf: 'pdf',
  file: 'file',
  link: 'link',
} as const;
export type AttachmentKind = (typeof AttachmentKind)[keyof typeof AttachmentKind];

export const BookmarkKind = {
  video: 'video',
  website: 'website',
  pdf: 'pdf',
  article: 'article',
  github: 'github',
  other: 'other',
} as const;
export type BookmarkKind = (typeof BookmarkKind)[keyof typeof BookmarkKind];

export const ReminderKind = {
  deadline: 'deadline',
  goal: 'goal',
  revision: 'revision',
  study: 'study',
  custom: 'custom',
} as const;
export type ReminderKind = (typeof ReminderKind)[keyof typeof ReminderKind];

export const ActivityKind = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  complete: 'complete',
  start: 'start',
  end: 'end',
  login: 'login',
  other: 'other',
} as const;
export type ActivityKind = (typeof ActivityKind)[keyof typeof ActivityKind];

export const NotificationKind = {
  deadline: 'deadline',
  goal: 'goal',
  revision: 'revision',
  reminder: 'reminder',
  system: 'system',
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export const Theme = {
  light: 'light',
  dark: 'dark',
  system: 'system',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const MemberRole = {
  owner: 'owner',
  admin: 'admin',
  member: 'member',
  viewer: 'viewer',
} as const;
export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];
