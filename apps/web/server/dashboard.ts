/**
 * Server-side queries for the dashboard. Pure Drizzle — no fetch overhead.
 *
 * Why raw SQL for counts and per-day grouping?
 *   Neon HTTP and node-pg return slightly different shapes (`{ rows }` vs the
 *   value directly). We normalise through `sql<number>` casts so the call site
 *   treats both transports identically.
 */
import 'server-only';
import { and, count, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { course, courseProgress, task } from '@studyflow/db/schema';

export interface DashboardData {
  counts: {
    activeCourses: number;
    completedCourses: number;
    activeTasks: number;
    totalSessions: number;
    totalMinutes: number;
  };
  upcomingTasks: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    dueAt: Date | null;
    courseId: string | null;
    courseTitle: string | null;
    courseColor: string | null;
  }>;
  recentSessionsByDay: Array<{ day: string; minutes: number }>;
  courses: Array<{
    id: string;
    title: string;
    color: string | null;
    icon: string | null;
    status: string;
    percent: number;
    estimatedMinutes: number;
  }>;
}

/**
 * Normalise the row shape from raw SELECTs so we don't care which driver
 * the runtime picked.
 */
function firstNumber(row: unknown): number {
  if (row == null) return 0;
  if (Array.isArray(row)) {
    const first = row[0];
    if (first == null) return 0;
    if (typeof first === 'object') {
      const values = Object.values(first as Record<string, unknown>);
      const n = Number(values[0]);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(first);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof row === 'object') {
    const values = Object.values(row as Record<string, unknown>);
    const n = Number(values[0]);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(row);
  return Number.isFinite(n) ? n : 0;
}

function firstNumberPair(row: unknown): { a: number; b: number } {
  if (row == null) return { a: 0, b: 0 };
  const values =
    Array.isArray(row)
      ? Array.isArray(row[0])
        ? (row[0] as unknown[])
        : Object.values((row[0] ?? {}) as Record<string, unknown>)
      : Object.values(row as Record<string, unknown>);
  return {
    a: Number.isFinite(Number(values[0])) ? Number(values[0]) : 0,
    b: Number.isFinite(Number(values[1])) ? Number(values[1]) : 0,
  };
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [
    activeCoursesRes,
    completedCoursesRes,
    activeTasksRes,
    totalSessionsRes,
    upcomingTasks,
    weekSessions,
    recentCourses,
  ] = await Promise.all([
    db
      .select({ n: count() })
      .from(course)
      .where(
        and(
          eq(course.ownerId, userId),
          isNull(course.deletedAt),
          eq(course.status, 'active'),
        ),
      ),
    db
      .select({ n: count() })
      .from(course)
      .where(
        and(
          eq(course.ownerId, userId),
          isNull(course.deletedAt),
          eq(course.status, 'completed'),
        ),
      ),
    db
      .select({ n: count() })
      .from(task)
      .where(
        and(
          eq(task.userId, userId),
          isNull(task.deletedAt),
          ne(task.status, 'completed'),
        ),
      ),
    db.execute<{ count: string; total: string }>(sql`
      SELECT count(*)::text AS count,
             coalesce(sum(duration_seconds),0)::text AS total
      FROM study_sessions
      WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
    `),
    db
      .select({
        id: task.id,
        title: task.title,
        type: task.type,
        priority: task.priority,
        status: task.status,
        dueAt: task.dueAt,
        courseId: task.courseId,
        courseTitle: course.title,
        courseColor: course.color,
      })
      .from(task)
      .leftJoin(course, eq(task.courseId, course.id))
      .where(
        and(
          eq(task.userId, userId),
          isNull(task.deletedAt),
          ne(task.status, 'completed'),
        ),
      )
      .orderBy(sql`${task.dueAt} ASC NULLS LAST`)
      .limit(6),
    db.execute<{ bucket: string; seconds: string }>(sql`
      SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS bucket,
             coalesce(sum(duration_seconds),0)::text AS seconds
      FROM study_sessions
      WHERE user_id = ${userId}::uuid
        AND deleted_at IS NULL
        AND started_at >= ${fourteenDaysAgo}::timestamptz
      GROUP BY 1
      ORDER BY 1
    `),
    db
      .select({
        id: course.id,
        title: course.title,
        color: course.color,
        icon: course.icon,
        status: course.status,
        percent: courseProgress.percent,
        estimatedMinutes: course.estimatedMinutes,
      })
      .from(course)
      .leftJoin(
        courseProgress,
        and(
          eq(courseProgress.courseId, course.id),
          eq(courseProgress.userId, userId),
        ),
      )
      .where(and(eq(course.ownerId, userId), isNull(course.deletedAt)))
      .orderBy(desc(course.updatedAt))
      .limit(4),
  ]);

  // Build last-14-days series, zero-filling missing days.
  const byDay = new Map<string, number>();
  for (const row of weekSessions as unknown as Array<{ bucket: string; seconds: string }>) {
    byDay.set(String(row.bucket), Number(row.seconds) / 60);
  }
  const today = new Date();
  const recentSessionsByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: key.slice(5), minutes: Math.round(byDay.get(key) ?? 0) };
  });

  const sessionTotals = firstNumberPair(totalSessionsRes);

  return {
    counts: {
      activeCourses: firstNumber(activeCoursesRes),
      completedCourses: firstNumber(completedCoursesRes),
      activeTasks: firstNumber(activeTasksRes),
      totalSessions: sessionTotals.a,
      totalMinutes: Math.round(sessionTotals.b / 60),
    },
    upcomingTasks: upcomingTasks.map((t) => ({
      ...t,
      dueAt: t.dueAt ?? null,
      courseId: t.courseId ?? null,
      courseTitle: t.courseTitle ?? null,
      courseColor: t.courseColor ?? null,
    })),
    recentSessionsByDay,
    courses: recentCourses.map((c) => ({
      id: c.id,
      title: c.title,
      color: c.color ?? '#6366F1',
      icon: c.icon ?? 'book',
      status: c.status,
      percent: Number(c.percent ?? 0),
      estimatedMinutes: c.estimatedMinutes,
    })),
  };
}
