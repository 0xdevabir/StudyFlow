'use client';
/**
 * Vertical list view of tasks. Renders grouped sections (Overdue, Today, This
 * week, Later, No due date) when due dates are present, otherwise a single
 * flat list sorted by the active filter.
 */
import * as React from 'react';
import { CheckSquare } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { TaskCard, type TaskCardData } from './task-card';

interface TaskListProps {
  tasks: TaskCardData[];
  onEdit?: (t: TaskCardData) => void;
}

interface Bucket {
  key: string;
  label: string;
  tasks: TaskCardData[];
}

function bucketTasks(tasks: TaskCardData[]): Bucket[] {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const overdue: TaskCardData[] = [];
  const today: TaskCardData[] = [];
  const thisWeek: TaskCardData[] = [];
  const later: TaskCardData[] = [];
  const noDue: TaskCardData[] = [];

  for (const t of tasks) {
    if (!t.dueAt) {
      noDue.push(t);
      continue;
    }
    const due = new Date(t.dueAt);
    if (due < startOfToday) overdue.push(t);
    else if (due <= endOfToday) today.push(t);
    else if (due <= endOfWeek) thisWeek.push(t);
    else later.push(t);
  }

  const buckets: Bucket[] = [];
  if (overdue.length) buckets.push({ key: 'overdue', label: 'Overdue', tasks: overdue });
  if (today.length) buckets.push({ key: 'today', label: 'Today', tasks: today });
  if (thisWeek.length) buckets.push({ key: 'week', label: 'This week', tasks: thisWeek });
  if (later.length) buckets.push({ key: 'later', label: 'Later', tasks: later });
  if (noDue.length) buckets.push({ key: 'none', label: 'No due date', tasks: noDue });
  return buckets;
}

export function TaskList({ tasks, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            <CheckSquare className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold">No tasks yet</h3>
          <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
            Create a task to capture a quick to-do or schedule time on a course topic.
          </p>
        </CardContent>
      </Card>
    );
  }

  const buckets = bucketTasks(tasks);

  // If no bucket boundaries match (e.g. everything is "no due date" or the user
  // filtered by status), show a single flat list.
  if (buckets.length <= 1 && (buckets.length === 0 || buckets[0]!.key === 'none')) {
    return (
      <div className="grid gap-2">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onEdit={onEdit} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {buckets.map((bucket) => (
        <section key={bucket.key}>
          <header className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {bucket.label}
            </h2>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {bucket.tasks.length}
            </span>
          </header>
          <div className="grid gap-2">
            {bucket.tasks.map((t) => (
              <TaskCard key={t.id} task={t} onEdit={onEdit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}