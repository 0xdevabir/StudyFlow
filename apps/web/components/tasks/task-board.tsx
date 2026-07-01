'use client';
/**
 * Kanban board view. Four fixed columns (Pending / In progress / Completed /
 * Cancelled). Each column renders a TaskCard stack.
 *
 * Drag-and-drop is intentionally not wired yet — the API supports reorder but
 * getting dnd-kit right takes more time. The columns reflect the user's
 * actual task statuses and let them see the global picture at a glance.
 */
import * as React from 'react';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { TaskCard, type TaskCardData } from './task-card';
import { type TaskStatus } from './task-badges';

interface TaskBoardProps {
  tasks: TaskCardData[];
  onEdit?: (t: TaskCardData) => void;
}

const COLUMNS: Array<{ key: TaskStatus; label: string; tint: string }> = [
  { key: 'pending', label: 'Pending', tint: 'border-slate-500/30' },
  { key: 'in_progress', label: 'In progress', tint: 'border-indigo-500/30' },
  { key: 'completed', label: 'Completed', tint: 'border-emerald-500/30' },
  { key: 'cancelled', label: 'Cancelled', tint: 'border-zinc-500/30' },
];

export function TaskBoard({ tasks, onEdit }: TaskBoardProps) {
  const byStatus = React.useMemo(() => {
    const map: Record<TaskStatus, TaskCardData[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = byStatus[col.key];
        return (
          <div key={col.key} className={cn('rounded-xl border bg-[var(--color-card)]/60', col.tint)}>
            <header className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {col.label}
              </h3>
              <span className="text-xs text-[var(--color-muted-foreground)]">{items.length}</span>
            </header>
            <div className="space-y-2 p-2">
              {items.length === 0 ? (
                <Card className="border-dashed bg-transparent shadow-none">
                  <CardContent className="p-4 text-center text-xs text-[var(--color-muted-foreground)]">
                    Nothing here yet.
                  </CardContent>
                </Card>
              ) : (
                items.map((t) => <TaskCard key={t.id} task={t} compact onEdit={onEdit} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}