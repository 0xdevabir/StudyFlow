/**
 * Server-side queries for the dashboard. Pure Drizzle — no fetch overhead.
 */
import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { course, courseHierarchy, courseProgress, task } from '@studyflow/db/schema';

export interface DashboardData {
  greeting: string;
  counts: {
    activeCourses: number;
    completedCourses: number;
    activeTasks: number;
    sessionsThisWeek: number;
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

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    coursesRes,
    completedRes,
    activeTasksRes,
    sessionsRes,
    upcomingTasks,
    weekSessions,
    recentCourses,
  ] = await Promise.all([
    db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count FROM courses
      WHERE owner_id = ${userId}::uuid AND deleted_at IS NULL AND status = 'active'
    `),
    db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count FROM courses
      WHERE owner_id = ${userId}::uuid AND deleted_at IS NULL AND status = 'completed'
    `),
    db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count FROM tasks
      WHERE user_id = ${userId}::uuid AND deleted_at IS NULL AND status IN ('pending','in_progress')
    `),
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
      .leftJoin(course, sql`${task.courseId} = ${course.id}`)
      .where(sql`${task.userId} = ${userId}::uuid AND ${task.deletedAt} IS NULL AND ${task.status} <> 'completed'`)
      .orderBy(sql`${task.dueAt} ASC NULLS LAST`)
      .limit(6),
    db.execute<{ bucket: string; seconds: string }>(sql`
      SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS bucket,
             coalesce(sum(duration_seconds),0)::text AS seconds
      FROM study_sessions
      WHERE user_id = ${userId}::uuid
        AND deleted_at IS NULL
        AND started_at >= now() - interval '13 days'
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
      .leftJoin(courseProgress, sql`${courseProgress.courseId} = ${course.id} AND ${courseProgress.userId} = ${userId}::uuid`)
      .where(sql`${course.ownerId} = ${userId}::uuid AND ${course.deletedAt} IS NULL`)
      .orderBy(sql`${course.updatedAt} DESC`)
      .limit(4),
  ]);

  // Build last-14-days series (zero-fill missing days).
  const byDay = new Map<string, number>();
  for (const row of weekSessions.rows ?? []) {
    byDay.set(String((row as { bucket: string }).bucket), Number((row as { seconds: string }).seconds) / 60);
  }
  const today = new Date();
  const recentSessionsByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      day: key.slice(5),
      minutes: Math.round(byDay.get(key) ?? 0),
    };
  });

  return {
    greeting: '',
    counts: {
      activeCourses: Number((coursesRes.rows?.[0] as { count: string } | undefined)?.count ?? 0),
      completedCourses: Number((completedRes.rows?.[0] as { count: string } | undefined)?.count ?? 0),
      activeTasks: Number((activeTasksRes.rows?.[0] as { count: string } | undefined)?.count ?? 0),
      sessionsThisWeek: Number((sessionsRes.rows?.[0] as { count: string } | undefined)?.count ?? 0),
      totalMinutes: Math.round(Number((sessionsRes.rows?.[0] as { total: string } | undefined)?.total ?? 0) / 60),
    },
    upcomingTasks: upcomingTasks.map((t) => ({
      ...t,
      dueAt: t.dueAt ?? null,
    })),
    recentSessionsByDay,
    courses: recentCourses.map((c) => ({
      ...c,
      percent: Number(c.percent ?? 0),
      color: c.color ?? '#6366F1',
      icon: c.icon ?? 'book',
    })),
  };
}
