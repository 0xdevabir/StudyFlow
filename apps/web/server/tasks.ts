/**
 * Server-side queries for the Tasks module. Talks to Drizzle directly so the
 * initial page render doesn't pay a fetch round-trip.
 */
import 'server-only';
import { and, asc, count, desc, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { course, task } from '@studyflow/db/schema';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'assignment' | 'quiz' | 'practice' | 'revision' | 'exam' | 'custom';

export interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  estimateMinutes: number;
  actualMinutes: number;
  completedAt: Date | null;
  courseId: string | null;
  hierarchyId: string | null;
  parentTaskId: string | null;
  courseTitle: string | null;
  courseColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTasksArgs {
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  courseId?: string;
  hierarchyId?: string;
  includeCompleted?: boolean;
  overdue?: boolean;
  dueWithin?: number;
  q?: string;
  sort?: 'recent' | 'due' | 'priority' | 'title';
  limit?: number;
}

export async function listTasks(
  ownerId: string,
  filters: ListTasksArgs = {},
): Promise<{ tasks: TaskSummary[]; total: number; counts: Record<TaskStatus, number> }> {
  const where = [eq(task.userId, ownerId), isNull(task.deletedAt)];
  if (filters.status) where.push(eq(task.status, filters.status));
  if (filters.priority) where.push(eq(task.priority, filters.priority));
  if (filters.type) where.push(eq(task.type, filters.type));
  if (filters.courseId) where.push(eq(task.courseId, filters.courseId));
  if (filters.hierarchyId) where.push(eq(task.hierarchyId, filters.hierarchyId));
  if (!filters.includeCompleted && !filters.status) {
    where.push(ne(task.status, 'completed'));
  }
  if (filters.overdue) {
    where.push(sql`${task.dueAt} < now()`);
  }
  if (filters.dueWithin) {
    where.push(
      sql`${task.dueAt} >= now() AND ${task.dueAt} <= now() + (interval '1 day' * ${filters.dueWithin})`,
    );
  }
  if (filters.q && filters.q.trim().length > 0) {
    const q = `%${filters.q.trim()}%`;
    where.push(
      or(sql`${task.title} ILIKE ${q}`, sql`${task.description} ILIKE ${q}`)!,
    );
  }

  const order = (() => {
    switch (filters.sort) {
      case 'title':
        return [asc(task.title)];
      case 'priority':
        return [
          sql`case ${task.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
          asc(task.dueAt),
          desc(task.createdAt),
        ];
      case 'recent':
        return [desc(task.createdAt)];
      case 'due':
      default:
        return [sql`${task.dueAt} ASC NULLS LAST`, desc(task.createdAt)];
    }
  })();

  const rows = await db
    .select({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt,
      estimateMinutes: task.estimateMinutes,
      actualMinutes: task.actualMinutes,
      completedAt: task.completedAt,
      courseId: task.courseId,
      hierarchyId: task.hierarchyId,
      parentTaskId: task.parentTaskId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      courseTitle: course.title,
      courseColor: course.color,
    })
    .from(task)
    .leftJoin(course, eq(task.courseId, course.id))
    .where(and(...where))
    .orderBy(...order)
    .limit(Math.min(filters.limit ?? 100, 200));

  const totalRes = await db
    .select({ n: count() })
    .from(task)
    .where(and(eq(task.userId, ownerId), isNull(task.deletedAt)));

  // Per-status counts for the board view. Independent of the active filter —
  // we always show the global split so the user understands total work.
  const statusRows = await db
    .select({ status: task.status, n: count() })
    .from(task)
    .where(and(eq(task.userId, ownerId), isNull(task.deletedAt)))
    .groupBy(task.status);

  const counts: Record<TaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const r of statusRows) {
    counts[r.status as TaskStatus] = Number(r.n);
  }

  return {
    tasks: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      status: r.status,
      priority: r.priority,
      dueAt: r.dueAt,
      estimateMinutes: r.estimateMinutes,
      actualMinutes: r.actualMinutes,
      completedAt: r.completedAt,
      courseId: r.courseId,
      hierarchyId: r.hierarchyId,
      parentTaskId: r.parentTaskId,
      courseTitle: r.courseTitle ?? null,
      courseColor: r.courseColor ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total: Number(totalRes[0]?.n ?? 0),
    counts,
  };
}

export async function listCourseOptions(ownerId: string) {
  const rows = await db
    .select({ id: course.id, title: course.title, color: course.color })
    .from(course)
    .where(and(eq(course.ownerId, ownerId), isNull(course.deletedAt)))
    .orderBy(asc(course.title));
  return rows;
}