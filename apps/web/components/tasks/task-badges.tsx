'use client';
/**
 * Re-usable presentation atoms for tasks: priority pill, status pill, type chip,
 * and a "due in" chip that highlights overdue items.
 */
import * as React from 'react';
import { cn } from '~/lib/utils';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskType = 'assignment' | 'quiz' | 'practice' | 'revision' | 'exam' | 'custom';

const priorityStyles: Record<TaskPriority, string> = {
  urgent: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/20',
  high: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20',
  medium: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/20',
  low: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-1 ring-slate-500/20',
};

const statusStyles: Record<TaskStatus, string> = {
  pending: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20',
  in_progress: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20',
  completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20',
  cancelled: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-500/20',
};

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const priorityLabels: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const typeLabels: Record<TaskType, string> = {
  assignment: 'Assignment',
  quiz: 'Quiz',
  practice: 'Practice',
  revision: 'Revision',
  exam: 'Exam',
  custom: 'Custom',
};

export function PriorityPill({ value }: { value: TaskPriority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        priorityStyles[value],
      )}
    >
      {priorityLabels[value]}
    </span>
  );
}

export function StatusPill({ value }: { value: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        statusStyles[value],
      )}
    >
      {statusLabels[value]}
    </span>
  );
}

export function TypeChip({ value }: { value: TaskType }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
      {typeLabels[value]}
    </span>
  );
}

export function DueChip({ dueAt }: { dueAt: Date | null }) {
  if (!dueAt) {
    return (
      <span className="inline-flex items-center rounded-md bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
        No due date
      </span>
    );
  }
  const date = new Date(dueAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = diffMs < 0;
  const isSoon = diffDays <= 3 && diffDays >= 0;

  const label = (() => {
    const sameYear = date.getFullYear() === now.getFullYear();
    return sameYear
      ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  let hint = '';
  if (isOverdue) {
    const ago = Math.abs(diffDays);
    hint = ago === 0 ? 'today' : `${ago}d overdue`;
  } else if (diffDays === 0) hint = 'today';
  else if (diffDays === 1) hint = 'tomorrow';
  else if (diffDays > 0 && diffDays <= 7) hint = `in ${diffDays}d`;
  else hint = `in ${diffDays}d`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        isOverdue && 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
        isSoon && !isOverdue && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        !isOverdue && !isSoon && 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
      )}
    >
      <span>{label}</span>
      <span className="opacity-70">· {hint}</span>
    </span>
  );
}