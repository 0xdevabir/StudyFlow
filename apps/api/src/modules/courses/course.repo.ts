/**
 * Courses repository — the only file that touches the courses table.
 * Other modules import this; never query the table directly from outside.
 */
import { and, asc, count, desc, eq, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { course, courseHierarchy, courseProgress } from '@studyflow/db/schema';
import type {
  CreateCourseInput,
  ListCoursesQuery,
  UpdateCourseInput,
} from '@studyflow/shared';

export type CourseRow = typeof course.$inferSelect;

export async function listCourses(
  ownerId: string,
  query: ListCoursesQuery,
): Promise<{ data: CourseRow[]; nextCursor: string | null; total: number }> {
  const filters = [eq(course.ownerId, ownerId), isNull(course.deletedAt)];

  if (query.status) filters.push(eq(course.status, query.status));
  if (!query.includeArchived) {
    filters.push(sql`${course.status} <> 'archived'`);
  }
  if (query.priority) filters.push(eq(course.priority, query.priority));
  if (query.category) filters.push(eq(course.category, query.category));
  if (query.q) {
    const q = `%${query.q}%`;
    filters.push(
      or(
        ilike(course.title, q),
        ilike(course.description, q),
        ilike(course.instructor, q),
        ilike(course.category, q),
      )!,
    );
  }
  if (query.cursor) {
    filters.push(lt(course.createdAt, new Date(query.cursor)));
  }

  const order = (() => {
    switch (query.sort) {
      case 'title':
        return [asc(course.title)];
      case 'priority':
        return [
          sql`case ${course.priority} when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
          desc(course.createdAt),
        ];
      case 'started':
        return [desc(course.startedAt), desc(course.createdAt)];
      case 'recent':
      default:
        return [desc(course.createdAt)];
    }
  })();

  const limit = query.limit + 1;
  const rows = await db
    .select()
    .from(course)
    .where(and(...filters))
    .orderBy(...order)
    .limit(limit);

  let nextCursor: string | null = null;
  if (rows.length > query.limit) {
    const last = rows.pop();
    if (last) nextCursor = last.createdAt.toISOString();
  }

  const totalRes = await db
    .select({ n: count() })
    .from(course)
    .where(and(eq(course.ownerId, ownerId), isNull(course.deletedAt)));

  return { data: rows, nextCursor, total: Number(totalRes[0]?.n ?? 0) };
}

export async function getCourse(ownerId: string, id: string): Promise<CourseRow | null> {
  const rows = await db
    .select()
    .from(course)
    .where(and(eq(course.id, id), eq(course.ownerId, ownerId), isNull(course.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCourse(
  ownerId: string,
  slug: string,
  input: CreateCourseInput,
): Promise<CourseRow> {
  const [row] = await db
    .insert(course)
    .values({
      ownerId,
      title: input.title,
      slug,
      description: input.description ?? null,
      category: input.category ?? null,
      source: input.source ?? null,
      url: input.url || null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      thumbnailUrl: input.thumbnailUrl || null,
      instructor: input.instructor ?? null,
      status: input.status ?? 'active',
      priority: input.priority ?? 'medium',
      estimatedMinutes: input.estimatedMinutes ?? 0,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
    })
    .returning();
  if (!row) throw new Error('Failed to create course');
  // Initialize an empty progress row.
  await db
    .insert(courseProgress)
    .values({ userId: ownerId, courseId: row.id, percent: 0, status: 'active' })
    .onConflictDoNothing();
  return row;
}

export async function updateCourse(
  ownerId: string,
  id: string,
  patch: UpdateCourseInput,
): Promise<CourseRow | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.source !== undefined) updates.source = patch.source;
  if (patch.url !== undefined) updates.url = patch.url;
  if (patch.color !== undefined) updates.color = patch.color;
  if (patch.icon !== undefined) updates.icon = patch.icon;
  if (patch.thumbnailUrl !== undefined) updates.thumbnailUrl = patch.thumbnailUrl;
  if (patch.instructor !== undefined) updates.instructor = patch.instructor;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.priority !== undefined) updates.priority = patch.priority;
  if (patch.estimatedMinutes !== undefined) updates.estimatedMinutes = patch.estimatedMinutes;
  if (patch.startedAt !== undefined) {
    updates.startedAt = patch.startedAt ? new Date(patch.startedAt) : null;
  }
  const [row] = await db
    .update(course)
    .set(updates)
    .where(and(eq(course.id, id), eq(course.ownerId, ownerId), isNull(course.deletedAt)))
    .returning();
  return row ?? null;
}

export async function updateCourseSlug(
  ownerId: string,
  id: string,
  slug: string,
): Promise<void> {
  await db
    .update(course)
    .set({ slug, updatedAt: new Date() })
    .where(and(eq(course.id, id), eq(course.ownerId, ownerId), isNull(course.deletedAt)));
}

export async function softDeleteCourse(ownerId: string, id: string): Promise<boolean> {
  const res = await db
    .update(course)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(course.id, id), eq(course.ownerId, ownerId), isNull(course.deletedAt)))
    .returning();
  return res.length > 0;
}

export async function archiveCourse(
  ownerId: string,
  id: string,
  archived: boolean,
): Promise<CourseRow | null> {
  const [row] = await db
    .update(course)
    .set({
      status: archived ? 'archived' : 'active',
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(course.id, id), eq(course.ownerId, ownerId), isNull(course.deletedAt)))
    .returning();
  return row ?? null;
}

export async function duplicateCourse(
  ownerId: string,
  id: string,
  newSlug: string,
  newTitle: string,
): Promise<CourseRow | null> {
  const original = await getCourse(ownerId, id);
  if (!original) return null;

  const [row] = await db
    .insert(course)
    .values({
      ownerId,
      title: newTitle,
      slug: newSlug,
      description: original.description,
      category: original.category,
      source: original.source,
      url: original.url,
      color: original.color,
      icon: original.icon,
      thumbnailUrl: original.thumbnailUrl,
      instructor: original.instructor,
      status: 'active',
      priority: original.priority,
      estimatedMinutes: original.estimatedMinutes,
    })
    .returning();
  if (!row) return null;

  // Duplicate root hierarchy nodes (depth-1).
  const roots = await db
    .select()
    .from(courseHierarchy)
    .where(and(eq(courseHierarchy.courseId, id), isNull(courseHierarchy.parentId)));

  for (const r of roots) {
    await db.insert(courseHierarchy).values({
      courseId: row.id,
      parentId: null,
      type: r.type,
      title: r.title,
      description: r.description,
      url: r.url,
      estimatedMinutes: r.estimatedMinutes,
      orderIndex: r.orderIndex,
    });
  }
  return row;
}

export async function slugExists(
  ownerId: string,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const filters = [
    eq(course.ownerId, ownerId),
    sql`lower(${course.slug}) = lower(${slug})`,
    isNull(course.deletedAt),
  ];
  if (excludeId) filters.push(sql`${course.id} <> ${excludeId}::uuid`);
  const rows = await db
    .select({ id: course.id })
    .from(course)
    .where(and(...filters))
    .limit(1);
  return rows.length > 0;
}

/** Build a unique slug for a course title. */
export async function buildUniqueSlug(
  ownerId: string,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200) || 'course';
  let candidate = base;
  let i = 2;
  while (candidate.length > 200) candidate = candidate.slice(0, 200);
  while (await slugExists(ownerId, candidate, excludeId)) {
    const suffix = `-${i}`;
    candidate = `${base.slice(0, 200 - suffix.length)}${suffix}`;
    i += 1;
  }
  return candidate;
}

export async function getCourseStats(ownerId: string, id: string) {
  const c = await getCourse(ownerId, id);
  if (!c) return null;

  const nodesRes = await db
    .select({ n: count() })
    .from(courseHierarchy)
    .where(and(eq(courseHierarchy.courseId, id), isNull(courseHierarchy.deletedAt)));

  const secondsRes = await db
    .select({ total: sql<number>`coalesce(sum(duration_seconds),0)::int` })
    .from(sql`study_sessions`)
    .where(sql`course_id = ${id}::uuid AND deleted_at IS NULL`);

  const tasksRes = await db
    .select({ n: count() })
    .from(sql`tasks`)
    .where(sql`course_id = ${id}::uuid AND deleted_at IS NULL`);

  return {
    course: c,
    nodes: Number(nodesRes[0]?.n ?? 0),
    seconds: Number(secondsRes[0]?.total ?? 0),
    tasks: Number(tasksRes[0]?.n ?? 0),
  };
}