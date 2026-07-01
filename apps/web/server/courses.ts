/**
 * Server-side queries for the Courses module. Talks to Drizzle directly,
 * keeping the read path off the API for SSR data.
 */
import 'server-only';
import { and, asc, desc, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { course, courseHierarchy, courseProgress, task } from '@studyflow/db/schema';

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  source: string | null;
  url: string | null;
  color: string | null;
  icon: string | null;
  instructor: string | null;
  status: string;
  priority: string;
  estimatedMinutes: number;
  percent: number;
  totalMinutes: number;
  nodeCount: number;
  openTasks: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function listCourses(
  ownerId: string,
  filters: {
    status?: 'active' | 'paused' | 'completed' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    q?: string;
    includeArchived?: boolean;
  } = {},
): Promise<CourseSummary[]> {
  const where = [eq(course.ownerId, ownerId), isNull(course.deletedAt)];
  if (filters.status) where.push(eq(course.status, filters.status));
  if (!filters.includeArchived) where.push(ne(course.status, 'archived'));
  if (filters.priority) where.push(eq(course.priority, filters.priority));
  if (filters.q && filters.q.trim().length > 0) {
    const q = `%${filters.q.trim()}%`;
    where.push(
      or(
        sql`${course.title} ILIKE ${q}`,
        sql`${course.description} ILIKE ${q}`,
        sql`${course.instructor} ILIKE ${q}`,
        sql`${course.category} ILIKE ${q}`,
      )!,
    );
  }

  const rows = await db
    .select({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category,
      source: course.source,
      url: course.url,
      color: course.color,
      icon: course.icon,
      instructor: course.instructor,
      status: course.status,
      priority: course.priority,
      estimatedMinutes: course.estimatedMinutes,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      percent: courseProgress.percent,
    })
    .from(course)
    .leftJoin(
      courseProgress,
      and(
        eq(courseProgress.courseId, course.id),
        eq(courseProgress.userId, ownerId),
      ),
    )
    .where(and(...where))
    .orderBy(desc(course.updatedAt));

  // Per-course node + task + session counts in one pass.
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const nodeRows = await db
    .select({
      courseId: courseHierarchy.courseId,
      n: sql<number>`count(*)::int`,
    })
    .from(courseHierarchy)
    .where(
      and(
        isNull(courseHierarchy.deletedAt),
        sql`${courseHierarchy.courseId} = ANY(${ids})::uuid[]`,
      ),
    )
    .groupBy(courseHierarchy.courseId);

  const taskRows = await db
    .select({
      courseId: task.courseId,
      n: sql<number>`count(*)::int`,
    })
    .from(task)
    .where(
      and(
        isNull(task.deletedAt),
        ne(task.status, 'completed'),
        sql`${task.courseId} = ANY(${ids})::uuid[]`,
      ),
    )
    .groupBy(task.courseId);

  const minuteRows = await db.execute<{ course_id: string; total: string }>(sql`
    SELECT course_id::text AS course_id,
           coalesce(sum(duration_seconds),0)::text AS total
    FROM study_sessions
    WHERE deleted_at IS NULL
      AND course_id = ANY(${ids})::uuid[]
    GROUP BY course_id
  `);

  const nodeMap = new Map<string, number>();
  for (const r of nodeRows) nodeMap.set(r.courseId, Number(r.n));
  const taskMap = new Map<string, number>();
  for (const r of taskRows) taskMap.set(r.courseId ?? '', Number(r.n));
  const minuteMap = new Map<string, number>();
  for (const r of (minuteRows as unknown as Array<{ course_id: string; total: string }>)) {
    minuteMap.set(r.course_id, Number(r.total) / 60);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    category: r.category,
    source: r.source,
    url: r.url,
    color: r.color,
    icon: r.icon,
    instructor: r.instructor,
    status: r.status,
    priority: r.priority,
    estimatedMinutes: r.estimatedMinutes,
    percent: Number(r.percent ?? 0),
    totalMinutes: Math.round(minuteMap.get(r.id) ?? 0),
    nodeCount: nodeMap.get(r.id) ?? 0,
    openTasks: taskMap.get(r.id) ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export interface HierarchyNode {
  id: string;
  courseId: string;
  parentId: string | null;
  path: string;
  orderIndex: number;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  estimatedMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function getCourseDetail(ownerId: string, id: string) {
  const rows = await db
    .select()
    .from(course)
    .where(and(eq(course.id, id), eq(course.ownerId, ownerId), isNull(course.deletedAt)))
    .limit(1);
  const c = rows[0];
  if (!c) return null;

  const treeRows = await db
    .select()
    .from(courseHierarchy)
    .where(
      and(
        eq(courseHierarchy.courseId, id),
        isNull(courseHierarchy.deletedAt),
      ),
    )
    .orderBy(asc(courseHierarchy.path), asc(courseHierarchy.orderIndex));

  const stats = await db.execute<{ nodes: string; minutes: string; tasks: string }>(sql`
    SELECT
      (SELECT count(*) FROM course_hierarchy
        WHERE course_id = ${id}::uuid AND deleted_at IS NULL)::text AS nodes,
      coalesce((SELECT sum(duration_seconds) FROM study_sessions
        WHERE course_id = ${id}::uuid AND deleted_at IS NULL),0)::text AS minutes,
      (SELECT count(*) FROM tasks
        WHERE course_id = ${id}::uuid AND deleted_at IS NULL)::text AS tasks
  `);
  const s = (stats as unknown as Array<{ nodes: string; minutes: string; tasks: string }>)[0];

  return {
    course: c,
    tree: treeRows,
    stats: {
      nodes: Number(s?.nodes ?? 0),
      minutes: Math.round(Number(s?.minutes ?? 0) / 60),
      tasks: Number(s?.tasks ?? 0),
    },
  };
}
