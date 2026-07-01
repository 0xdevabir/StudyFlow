'use client';
/**
 * Single task row — used in both list and board views. Renders the card UI
 * and wires the "complete" toggle / "reopen" buttons. Heavy actions
 * (edit, delete) live in the parent component.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '~/lib/api-client';
import { cn } from '~/lib/utils';
import {
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  DueChip,
  PriorityPill,
  StatusPill,
  TypeChip,
} from './task-badges';

export interface TaskCardData {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  estimateMinutes: number;
  courseId: string | null;
  courseTitle: string | null;
  courseColor: string | null;
}

interface TaskCardProps {
  task: TaskCardData;
  /** Compact mode renders a denser card suitable for kanban columns. */
  compact?: boolean;
  onEdit?: (t: TaskCardData) => void;
}

export function TaskCard({ task, compact = false, onEdit }: TaskCardProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<null | 'complete' | 'reopen' | 'delete'>(null);

  async function toggleComplete() {
    setPending(task.status === 'completed' ? 'reopen' : 'complete');
    try {
      if (task.status === 'completed') {
        await api.post(`/api/v1/tasks/${task.id}/reopen`);
        toast.success('Reopened');
      } else {
        await api.post(`/api/v1/tasks/${task.id}/complete`);
        toast.success('Marked complete');
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Action failed');
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    setPending('delete');
    try {
      await api.delete(`/api/v1/tasks/${task.id}`);
      toast.success('Deleted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Delete failed');
    } finally {
      setPending(null);
    }
  }

  const done = task.status === 'completed';

  return (
    <div
      className={cn(
        'group rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 transition-shadow',
        'hover:shadow-sm',
        done && 'opacity-70',
        compact && 'p-2.5',
      )}
    >
      <div className="flex items-start gap-2">
        {/* Toggle button */}
        <button
          type="button"
          onClick={toggleComplete}
          disabled={pending !== null}
          aria-label={done ? 'Reopen task' : 'Mark complete'}
          className={cn(
            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
            done
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'border-[var(--color-border)] bg-transparent text-transparent hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]/40',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-medium',
              done && 'line-through text-[var(--color-muted-foreground)]',
            )}
          >
            {task.title}
          </p>

          {!compact && task.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <DueChip dueAt={task.dueAt} />
            <PriorityPill value={task.priority} />
            {!compact && <TypeChip value={task.type} />}
            {task.courseTitle && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: task.courseColor ?? '#6366F1' }}
                />
                <span className="max-w-[120px] truncate">{task.courseTitle}</span>
              </span>
            )}
          </div>

          {!compact && (
            <div className="mt-2 flex items-center justify-between">
              <StatusPill value={task.status} />
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {task.status === 'completed' && (
                  <button
                    type="button"
                    onClick={toggleComplete}
                    disabled={pending !== null}
                    className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    aria-label="Reopen"
                    title="Reopen"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    disabled={pending !== null}
                    className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending !== null}
                  className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-rose-500/15 hover:text-rose-600"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {compact && (onEdit || done) && (
        <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-2">
          {done ? (
            <span className="text-[10px] text-[var(--color-muted-foreground)]">Completed</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={remove}
              disabled={pending !== null}
              className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-rose-500/15 hover:text-rose-600"
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}