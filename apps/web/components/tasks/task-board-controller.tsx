'use client';
/**
 * Top-level client container for the /tasks page. Owns the view-mode toggle
 * (list / board), the edit dialog open state, and the active filter URL
 * binding via searchParams.
 *
 * The page is still a server component that fetches the initial data; this
 * container receives the hydrated task list and renders either the list or
 * board view, with mutations handled via router.refresh().
 */
import * as React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { NewTaskDialog } from './new-task-dialog';
import { TaskBoard } from './task-board';
import { TaskList } from './task-list';
import { TaskFilters } from './task-filters';
import type { TaskCardData } from './task-card';

interface CourseOption {
  id: string;
  title: string;
}

interface TasksClientProps {
  tasks: TaskCardData[];
  counts: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  total: number;
  initialView: 'list' | 'board';
  courses: CourseOption[];
}

export function TasksClient({
  tasks,
  counts,
  total,
  initialView,
  courses,
}: TasksClientProps) {
  const [view, setView] = React.useState<'list' | 'board'>(initialView);
  const [editing, setEditing] = React.useState<TaskCardData | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">Your work, in one place</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--color-muted-foreground)]">
            Capture to-dos, schedule deep work, and see what&apos;s next across every course.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[var(--color-border)] p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'list'
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
              aria-pressed={view === 'list'}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'board'
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
              aria-pressed={view === 'board'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
          </div>
          <NewTaskDialog courses={courses} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <CountCard label="Pending" value={counts.pending} accent="bg-slate-500/15 text-slate-600 dark:text-slate-300" />
        <CountCard label="In progress" value={counts.in_progress} accent="bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" />
        <CountCard label="Completed" value={counts.completed} accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" />
        <CountCard label="Total" value={total} accent="bg-[var(--color-primary)]/15 text-[var(--color-primary)]" />
      </div>

      <TaskFilters />

      {view === 'list' ? (
        <TaskList tasks={tasks} onEdit={(t) => setEditing(t)} />
      ) : (
        <TaskBoard tasks={tasks} onEdit={(t) => setEditing(t)} />
      )}

      {editing && (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/50 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
          <span>
            Editing <span className="font-medium text-[var(--color-foreground)]">{editing.title}</span>
          </span>
          <NewTaskDialog task={editing} courses={courses} label="Open editor" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(null)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function CountCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center gap-2">
        <div className={cn('inline-flex h-7 w-7 items-center justify-center rounded-md', accent)}>
          <span className="text-xs font-semibold">{String(value).slice(0, 1)}</span>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}