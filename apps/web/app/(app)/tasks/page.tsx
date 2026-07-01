/**
 * Tasks index — server component fetches the initial list and dispatches to
 * the client container for view switching, filtering, and editing.
 */
import { redirect } from 'next/navigation';
import { TasksClient } from '~/components/tasks/task-board-controller';
import type {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '~/components/tasks/task-badges';
import { getCurrentUser } from '~/server/auth';
import { listCourseOptions, listTasks } from '~/server/tasks';

interface PageProps {
  searchParams?: Promise<{
    q?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    courseId?: string;
    overdue?: string;
    includeCompleted?: string;
    sort?: 'due' | 'recent' | 'priority' | 'title';
    view?: 'list' | 'board';
  }>;
}

export const dynamic = 'force-dynamic';

export default async function TasksPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sp = (await searchParams) ?? {};
  const { tasks, counts, total } = await listTasks(user.id, {
    q: sp.q,
    status: sp.status,
    priority: sp.priority,
    type: sp.type,
    courseId: sp.courseId,
    overdue: sp.overdue === 'true',
    includeCompleted: sp.includeCompleted === 'true',
    sort: sp.sort ?? 'due',
    limit: 200,
  });

  const courses = await listCourseOptions(user.id);

  const cardData = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    estimateMinutes: t.estimateMinutes,
    courseId: t.courseId,
    courseTitle: t.courseTitle,
    courseColor: t.courseColor,
  }));

  return (
    <TasksClient
      tasks={cardData}
      counts={counts}
      total={total}
      initialView={sp.view === 'board' ? 'board' : 'list'}
      courses={courses}
    />
  );
}