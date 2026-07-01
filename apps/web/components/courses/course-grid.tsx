'use client';
/**
 * Client-side grid of course cards. Provides an actions menu per card
 * (archive / duplicate / delete) that talks to the API and refreshes.
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { api } from '~/lib/api-client';
import type { CourseSummary } from '~/server/courses';
import { cn } from '~/lib/utils';

export function CourseGrid({ courses }: { courses: CourseSummary[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}

function CourseCard({ course: c }: { course: CourseSummary }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<'archive' | 'duplicate' | 'delete' | null>(null);

  async function archive() {
    setBusy('archive');
    try {
      await api.post(`/api/v1/courses/${c.id}/archive`, { archived: c.status !== 'archived' });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    setBusy('duplicate');
    try {
      await api.post(`/api/v1/courses/${c.id}/duplicate`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${c.title}"? This soft-deletes the course and its hierarchy.`)) return;
    setBusy('delete');
    try {
      await api.delete(`/api/v1/courses/${c.id}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const color = c.color ?? 'var(--color-primary)';

  return (
    <Card className="group relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: color }}
          >
            <BookIcon icon={c.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/courses/${c.id}`} className="block">
              <p className="truncate text-sm font-semibold tracking-tight hover:underline">{c.title}</p>
            </Link>
            <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
              {c.instructor ?? c.category ?? c.source ?? 'No description yet'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy !== null}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/courses/${c.id}`}>Open</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={archive} disabled={busy === 'archive'}>
                <Archive className="h-3.5 w-3.5" />
                {c.status === 'archived' ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={duplicate} disabled={busy === 'duplicate'}>
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={remove}
                disabled={busy === 'delete'}
                className="text-[var(--color-destructive)] focus:text-[var(--color-destructive)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--color-muted-foreground)]">{c.percent}% complete</span>
            <span className={cn('text-[10px] uppercase tracking-wider', priorityClass(c.priority))}>
              {c.priority}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, c.percent))}%`, background: color }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
          <span>{c.nodeCount} nodes</span>
          <span>·</span>
          <span>{c.openTasks} open tasks</span>
          <span>·</span>
          <span>{c.totalMinutes}m</span>
        </div>
      </CardContent>
    </Card>
  );
}

function priorityClass(p: string): string {
  switch (p) {
    case 'critical':
      return 'text-[var(--color-destructive)]';
    case 'high':
      return 'text-[var(--color-chart-3)]';
    case 'low':
      return 'text-[var(--color-muted-foreground)]';
    default:
      return 'text-[var(--color-chart-2)]';
  }
}

function BookIcon({ icon: _icon }: { icon: string | null }) {
  // Tiny lucide fallback so we don't pull dynamic imports for icons.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}