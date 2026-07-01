'use client';
/**
 * Course filters. Uses native form submission to the same page so the
 * server component re-renders with the new searchParams.
 */
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';

export function CourseFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get('q') ?? '');
  const [status, setStatus] = React.useState(params.get('status') ?? '');
  const [priority, setPriority] = React.useState(params.get('priority') ?? '');
  const [includeArchived, setIncludeArchived] = React.useState(
    params.get('includeArchived') === 'true',
  );

  function apply(next?: Partial<{ q: string; status: string; priority: string; includeArchived: boolean }>) {
    const sp = new URLSearchParams();
    const finalQ = next?.q ?? q;
    const finalStatus = next?.status ?? status;
    const finalPriority = next?.priority ?? priority;
    const finalArchived = next?.includeArchived ?? includeArchived;
    if (finalQ.trim()) sp.set('q', finalQ.trim());
    if (finalStatus) sp.set('status', finalStatus);
    if (finalPriority) sp.set('priority', finalPriority);
    if (finalArchived) sp.set('includeArchived', 'true');
    router.push(`/courses${sp.size > 0 ? `?${sp.toString()}` : ''}`);
  }

  function reset() {
    setQ('');
    setStatus('');
    setPriority('');
    setIncludeArchived(false);
    router.push('/courses');
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-12"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <Input
        className="sm:col-span-5"
        placeholder="Search title, instructor, category…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        className="sm:col-span-2 h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          apply({ status: e.target.value });
        }}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
      </select>
      <select
        className="sm:col-span-2 h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
        value={priority}
        onChange={(e) => {
          setPriority(e.target.value);
          apply({ priority: e.target.value });
        }}
      >
        <option value="">All priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <label className="sm:col-span-2 inline-flex h-9 items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => {
            setIncludeArchived(e.target.checked);
            apply({ includeArchived: e.target.checked });
          }}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        Archived
      </label>
      <div className="flex gap-2 sm:col-span-1">
        <Button type="submit" size="sm" className="flex-1">
          Go
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
    </form>
  );
}