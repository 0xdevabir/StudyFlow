/**
 * Course DTOs — validation schemas shared between API and Web.
 */
import { z } from 'zod';
import { CoursePriority, CourseStatus } from '../enums.js';

const hexColor = /^#?[0-9a-fA-F]{6}$/;

export const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
  color: z.string().regex(hexColor).optional().nullable(),
  icon: z.string().max(60).optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal('')),
  instructor: z.string().max(120).optional().nullable(),
  status: z.enum([
    CourseStatus.active,
    CourseStatus.paused,
    CourseStatus.completed,
    CourseStatus.archived,
  ]).default(CourseStatus.active),
  priority: z.enum([
    CoursePriority.low,
    CoursePriority.medium,
    CoursePriority.high,
    CoursePriority.critical,
  ]).default(CoursePriority.medium),
  estimatedMinutes: z.number().int().min(0).max(1_000_000).default(0),
  startedAt: z.string().datetime().optional().nullable(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial();
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const listCoursesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z
    .enum([
      CourseStatus.active,
      CourseStatus.paused,
      CourseStatus.completed,
      CourseStatus.archived,
    ])
    .optional(),
  priority: z
    .enum([
      CoursePriority.low,
      CoursePriority.medium,
      CoursePriority.high,
      CoursePriority.critical,
    ])
    .optional(),
  category: z.string().trim().min(1).max(80).optional(),
  includeArchived: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().uuid().optional(),
  sort: z
    .enum(['recent', 'title', 'priority', 'started'])
    .default('recent'),
});
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;

// Hierarchy node DTOs
export const createHierarchyNodeSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  type: z.string().min(1).max(40).default('item'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
  estimatedMinutes: z.number().int().min(0).max(1_000_000).default(0),
  orderIndex: z.number().int().min(0).max(1_000_000).optional(),
});
export type CreateHierarchyNodeInput = z.infer<typeof createHierarchyNodeSchema>;

export const updateHierarchyNodeSchema = createHierarchyNodeSchema.partial();
export type UpdateHierarchyNodeInput = z.infer<typeof updateHierarchyNodeSchema>;

export const moveHierarchyNodeSchema = z.object({
  /** Target parent (null = root). */
  parentId: z.string().uuid().nullable(),
  /** Zero-based position among siblings (after the move). */
  position: z.number().int().min(0).max(1_000_000).default(0),
});
export type MoveHierarchyNodeInput = z.infer<typeof moveHierarchyNodeSchema>;

export const reorderHierarchySchema = z.object({
  /** Ordered list of sibling ids. */
  orderedIds: z.array(z.string().uuid()).min(1).max(500),
  parentId: z.string().uuid().nullable().optional(),
});
export type ReorderHierarchyInput = z.infer<typeof reorderHierarchySchema>;

// Helpful slug helper (server-side only normally, but safe to share).
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);