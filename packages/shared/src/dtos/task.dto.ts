/**
 * Task DTOs — validation schemas shared between API and Web.
 */
import { z } from 'zod';
import { TaskPriority, TaskStatus, TaskType } from '../enums.js';

const isoDate = z
  .string()
  .datetime({ offset: true })
  .optional()
  .nullable()
  .or(z.literal(''));

export const createTaskSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional().nullable(),
  type: z
    .enum([
      TaskType.assignment,
      TaskType.quiz,
      TaskType.practice,
      TaskType.revision,
      TaskType.exam,
      TaskType.custom,
    ])
    .default(TaskType.custom),
  status: z
    .enum([
      TaskStatus.pending,
      TaskStatus.in_progress,
      TaskStatus.completed,
      TaskStatus.cancelled,
    ])
    .default(TaskStatus.pending),
  priority: z
    .enum([
      TaskPriority.low,
      TaskPriority.medium,
      TaskPriority.high,
      TaskPriority.urgent,
    ])
    .default(TaskPriority.medium),
  courseId: z.string().uuid().optional().nullable(),
  hierarchyId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  dueAt: isoDate,
  estimateMinutes: z.number().int().min(0).max(100_000).default(0),
  recurrenceRrule: z.string().max(500).optional().nullable(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const completeTaskSchema = z.object({
  actualMinutes: z.number().int().min(0).max(100_000).optional(),
});
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

export const listTasksQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z
    .enum([
      TaskStatus.pending,
      TaskStatus.in_progress,
      TaskStatus.completed,
      TaskStatus.cancelled,
    ])
    .optional(),
  priority: z
    .enum([
      TaskPriority.low,
      TaskPriority.medium,
      TaskPriority.high,
      TaskPriority.urgent,
    ])
    .optional(),
  type: z
    .enum([
      TaskType.assignment,
      TaskType.quiz,
      TaskType.practice,
      TaskType.revision,
      TaskType.exam,
      TaskType.custom,
    ])
    .optional(),
  courseId: z.string().uuid().optional(),
  hierarchyId: z.string().uuid().optional(),
  /** Filter: due within next N days. */
  dueWithin: z.coerce.number().int().min(1).max(365).optional(),
  /** When true, returns only overdue tasks. */
  overdue: z.coerce.boolean().default(false),
  includeCompleted: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
  sort: z
    .enum(['recent', 'due', 'priority', 'title'])
    .default('due'),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const reorderTasksSchema = z.object({
  /** Group tasks by status. The id order within each array sets board order. */
  columns: z.object({
    pending: z.array(z.string().uuid()).max(200).default([]),
    in_progress: z.array(z.string().uuid()).max(200).default([]),
    completed: z.array(z.string().uuid()).max(200).default([]),
    cancelled: z.array(z.string().uuid()).max(200).default([]),
  }),
});
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;