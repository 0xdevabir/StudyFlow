/**
 * Tasks repository. Owns Drizzle queries against the `tasks` table.
 */
import { and, asc, count, desc, eq, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { task } from '@studyflow/db/schema';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '@studyflow/shared';

export type TaskRow = typeof task.$inferSelect;

export async function listTasks(
  ownerId: string,
  query: ListTasksQuery,
): Promise<{ data: TaskRow[]; nextCursor: string | null; total: number }> {
  const filters = [eq(task.userId, ownerId), isNull(task.deletedAt)];

  if (query.status) filters.push(eq(task.status, query.status));
  if (query.priority) filters.push(eq(task.priority, query.priority));
  if (query.type) filters.push(eq(task.type, query.type));
  if (query.courseId) filters.push(eq(task.courseId, query.courseId));
  if (query.hierarchyId) filters.push(eq(task.hierarchyId, query.hierarchyId));
  if (!query.includeCompleted) {
    filters.push(sql`${task.status} <> 'completed'`);
  }
  if (query.overdue) {
    filters.push(sql`${task.dueAt} < now()`);
  }
  if (query.dueWithin) {
    filters.push(
      sql`${task.dueAt} >= now() AND ${task.dueAt} <= now() + (interval '1 day' * ${query.dueWithin})`,
    );
  }
  if (query.q) {
    const q = `%${query.q}%`;
    filters.push(
      or(
        ilike(task.title, q),
        ilike(task.description, q),
      )!,
    );
  }
  if (query.cursor) {
    filters.push(lt(task.createdAt, new Date(0))); // simple cursor — page via offset fallback
  }

  const order = (() => {
    switch (query.sort) {
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
        return [
          sql`${task.dueAt} ASC NULLS LAST`,
          desc(task.createdAt),
        ];
    }
  })();

  const limit = query.limit + 1;
  const rows = await db
    .select()
    .from(task)
    .where(and(...filters))
    .orderBy(...order)
    .limit(limit);

  let nextCursor: string | null = null;
  if (rows.length > query.limit) {
    const last = rows.pop();
    if (last) nextCursor = last.id;
  }

  const totalRes = await db
    .select({ n: count() })
    .from(task)
    .where(and(eq(task.userId, ownerId), isNull(task.deletedAt)));

  return { data: rows, nextCursor, total: Number(totalRes[0]?.n ?? 0) };
}

/** List tasks for a single course (used by course detail / future calendar views). */
export async function listTasksByCourse(courseId: string) {
  return db
    .select()
    .from(task)
    .where(and(eq(task.courseId, courseId), isNull(task.deletedAt)))
    .orderBy(asc(task.dueAt), asc(task.createdAt));
}

export async function getTask(ownerId: string, id: string): Promise<TaskRow | null> {
  const rows = await db
    .select()
    .from(task)
    .where(and(eq(task.id, id), eq(task.userId, ownerId), isNull(task.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTask(
  ownerId: string,
  input: CreateTaskInput,
): Promise<TaskRow> {
  const [row] = await db
    .insert(task)
    .values({
      userId: ownerId,
      title: input.title,
      description: input.description ?? null,
      type: input.type ?? 'custom',
      status: input.status ?? 'pending',
      priority: input.priority ?? 'medium',
      courseId: input.courseId ?? null,
      hierarchyId: input.hierarchyId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      dueAt: input.dueAt && input.dueAt !== '' ? new Date(input.dueAt) : null,
      estimateMinutes: input.estimateMinutes ?? 0,
      recurrenceRrule: input.recurrenceRrule ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to create task');
  return row;
}

export async function updateTask(
  ownerId: string,
  id: string,
  patch: UpdateTaskInput,
): Promise<TaskRow | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.type !== undefined) updates.type = patch.type;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.priority !== undefined) updates.priority = patch.priority;
  if (patch.courseId !== undefined) updates.courseId = patch.courseId;
  if (patch.hierarchyId !== undefined) updates.hierarchyId = patch.hierarchyId;
  if (patch.parentTaskId !== undefined) updates.parentTaskId = patch.parentTaskId;
  if (patch.dueAt !== undefined) {
    updates.dueAt = patch.dueAt && patch.dueAt !== '' ? new Date(patch.dueAt) : null;
  }
  if (patch.estimateMinutes !== undefined) updates.estimateMinutes = patch.estimateMinutes;
  if (patch.recurrenceRrule !== undefined) updates.recurrenceRrule = patch.recurrenceRrule;

  const [row] = await db
    .update(task)
    .set(updates)
    .where(and(eq(task.id, id), eq(task.userId, ownerId), isNull(task.deletedAt)))
    .returning();
  return row ?? null;
}

export async function completeTask(
  ownerId: string,
  id: string,
  actualMinutes?: number,
): Promise<TaskRow | null> {
  const [row] = await db
    .update(task)
    .set({
      status: 'completed',
      completedAt: new Date(),
      ...(typeof actualMinutes === 'number' ? { actualMinutes } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(task.id, id), eq(task.userId, ownerId), isNull(task.deletedAt)))
    .returning();
  return row ?? null;
}

export async function reopenTask(
  ownerId: string,
  id: string,
): Promise<TaskRow | null> {
  const [row] = await db
    .update(task)
    .set({
      status: 'pending',
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(task.id, id), eq(task.userId, ownerId), isNull(task.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteTask(ownerId: string, id: string): Promise<boolean> {
  const res = await db
    .update(task)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(task.id, id), eq(task.userId, ownerId), isNull(task.deletedAt)))
    .returning();
  return res.length > 0;
}

/** Bulk reorder: write new status + a synthetic orderIndex for each task. */
export async function reorderTasks(
  ownerId: string,
  columns: {
    pending: string[];
    in_progress: string[];
    completed: string[];
    cancelled: string[];
  },
): Promise<{ updated: number }> {
  const allIds = [...columns.pending, ...columns.in_progress, ...columns.completed, ...columns.cancelled];
  if (allIds.length === 0) return { updated: 0 };

  // Verify ownership once.
  const owned = await db
    .select({ id: task.id })
    .from(task)
    .where(and(eq(task.userId, ownerId), inArray(task.id, allIds), isNull(task.deletedAt)));
  const ownedSet = new Set(owned.map((r) => r.id));

  let updated = 0;
  const stamp = Date.now();
  // Stamp positions with high-resolution time so future sorts can use it
  // if we ever add a `position` column. For now we just set status.
  for (const [statusKey, ids] of Object.entries(columns) as Array<
    ['pending' | 'in_progress' | 'completed' | 'cancelled', string[]]
  >) {
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (!id || !ownedSet.has(id)) continue;
      await db
        .update(task)
        .set({
          status: statusKey,
          completedAt: statusKey === 'completed' ? new Date(stamp + i) : null,
          updatedAt: new Date(),
        })
        .where(eq(task.id, id));
      updated += 1;
    }
  }
  return { updated };
}

/** Lightweight stats used by the dashboard "Up next" section. */
export async function upcomingTasks(ownerId: string, limit = 6) {
  return db
    .select({
      id: task.id,
      title: task.title,
      type: task.type,
      priority: task.priority,
      status: task.status,
      dueAt: task.dueAt,
      courseId: task.courseId,
    })
    .from(task)
    .where(
      and(
        eq(task.userId, ownerId),
        isNull(task.deletedAt),
        sql`${task.status} <> 'completed'`,
      ),
    )
    .orderBy(sql`${task.dueAt} ASC NULLS LAST`, desc(task.createdAt))
    .limit(limit);
}