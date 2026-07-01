'use client';
/**
 * Tasks filter bar. URL-driven: the page server-component reads the same
 * search params to query Drizzle directly.
 */
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

type Sort = 'due' | 'recent' | 'priority' | 'title';

export function TaskFilters() {
  return (
    <React.Suspense
      fallback={
        <div className="h-9 w-full animate-pulse rounded-md bg-[var(--color-muted)]" />
      }
    >
      <TaskFiltersInner />
    </React.Suspense>
  );
}

function TaskFiltersInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = React.useState(params.get('q') ?? '');
  const [status, setStatus] = React.useState(params.get('status') ?? '');
  const [priority, setPriority] = React.useState(params.get('priority') ?? '');
  const [type, setType] = React.useState(params.get('type') ?? '');
  const [sort, setSort] = React.useState<Sort>(
    (params.get('sort') as Sort) ?? 'due',
  );
  const [overdue, setOverdue] = React.useState(params.get('overdue') === 'true');
  const [includeCompleted, setIncludeCompleted] = React.useState(
    params.get('includeCompleted') === 'true',
  );

  function push(next?: Partial<{
    q: string;
    status: string;
    priority: string;
    type: string;
    sort: Sort;
    overdue: boolean;
    includeCompleted: boolean;
  }>) {
    const sp = new URLSearchParams();
    const fQ = next?.q ?? q;
    const fStatus = next?.status ?? status;
    const fPriority = next?.priority ?? priority;
    const fType = next?.type ?? type;
    const fSort = next?.sort ?? sort;
    const fOverdue = next?.overdue ?? overdue;
    const fCompleted = next?.includeCompleted ?? includeCompleted;
    if (fQ.trim()) sp.set('q', fQ.trim());
    if (fStatus) sp.set('status', fStatus);
    if (fPriority) sp.set('priority', fPriority);
    if (fType) sp.set('type', fType);
    if (fSort && fSort !== 'due') sp.set('sort', fSort);
    if (fOverdue) sp.set('overdue', 'true');
    if (fCompleted) sp.set('includeCompleted', 'true');
    router.push(`/tasks${sp.size > 0 ? `?${sp.toString()}` : ''}`);
  }

  function reset() {
    setQ('');
    setStatus('');
    setPriority('');
    setType('');
    setSort('due');
    setOverdue(false);
    setIncludeCompleted(false);
    router.push('/tasks');
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-12"
      onSubmit={(e) => {
        e.preventDefault();
        push();
      }}
    >
      <Input
        className="sm:col-span-4"
        placeholder="Search title or description…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        className="sm:col-span-2 h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          push({ status: e.target.value });
        }}
        aria-label="Status"
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select
        className="sm:col-span-2 h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
        value={priority}
        onChange={(e) => {
          setPriority(e.target.value);
          push({ priority: e.target.value });
        }}
        aria-label="Priority"
      >
        <option value="">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select
        className="sm:col-span-2 h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
        value={sort}
        onChange={(e) => {
          setSort(e.target.value as Sort);
          push({ sort: e.target.value as Sort });
        }}
        aria-label="Sort"
      >
        <option value="due">Sort: Due</option>
        <option value="recent">Sort: Recent</option>
        <option value="priority">Sort: Priority</option>
        <option value="title">Sort: Title</option>
      </select>
      <label className="sm:col-span-1 inline-flex h-9 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <input
          type="checkbox"
          checked={overdue}
          onChange={(e) => {
            setOverdue(e.target.checked);
            push({ overdue: e.target.checked });
          }}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        Overdue
      </label>
      <label className="sm:col-span-1 inline-flex h-9 items-center justify-end gap-2 text-xs text-[var(--color-muted-foreground)]">
        <input
          type="checkbox"
          checked={includeCompleted}
          onChange={(e) => {
            setIncludeCompleted(e.target.checked);
            push({ includeCompleted: e.target.checked });
          }}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        Done
      </label>
      <div className="flex gap-2 sm:col-span-12 lg:col-span-12">
        <Button type="submit" size="sm">
          Apply
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
    </form>
  );
}