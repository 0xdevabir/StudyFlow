import Link from 'next/link';
import { ArrowUpRight, BookOpen, Clock, Flame, GraduationCap, ListChecks, Plus, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { StudyChart } from '~/components/data/study-chart';
import { getDashboardData } from '~/server/dashboard';
import { getCurrentUser } from '~/server/auth';
import { timeOfDayGreeting } from '~/lib/utils';

// Node.js runtime — see note in (app)/layout.tsx.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await getDashboardData(user.id);
  const greeting = timeOfDayGreeting(user.name);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">{greeting}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome back to StudyFlow</h1>
        </div>
        <Link href="/courses">
          <Button>
            <Plus className="h-4 w-4" />
            New course
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/courses" className="block">
          <StatCard
            icon={GraduationCap}
            label="Active courses"
            value={data.counts.activeCourses}
            accent="bg-[var(--color-chart-1)]/15 text-[var(--color-chart-1)]"
          />
        </Link>
        <Link href="/tasks" className="block">
          <StatCard
            icon={ListChecks}
            label="Tasks pending"
            value={data.counts.activeTasks}
            accent="bg-[var(--color-chart-2)]/15 text-[var(--color-chart-2)]"
          />
        </Link>
        <StatCard
          icon={Clock}
          label="Total study"
          value={`${Math.floor(data.counts.totalMinutes / 60)}h ${data.counts.totalMinutes % 60}m`}
          accent="bg-[var(--color-chart-3)]/15 text-[var(--color-chart-3)]"
        />
        <StatCard
          icon={Flame}
          label="Sessions"
          value={data.counts.totalSessions}
          accent="bg-[var(--color-chart-4)]/15 text-[var(--color-chart-4)]"
        />
      </div>

      {/* Chart + tasks */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Study hours</CardTitle>
              <CardDescription>Your last 14 days of focused learning.</CardDescription>
            </div>
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
          </CardHeader>
          <CardContent>
            <StudyChart data={data.recentSessionsByDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Up next</CardTitle>
            <Link href="/tasks" className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingTasks.length === 0 ? (
              <EmptyMini
                title="Nothing due"
                text="You're all caught up. Add a task or start a study session."
              />
            ) : (
              data.upcomingTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks?status=${t.status}`}
                  className="flex items-start gap-3 rounded-lg border border-[var(--color-border)]/60 p-3 transition-colors hover:bg-[var(--color-accent)]/40"
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: t.courseColor ?? 'var(--color-primary)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {t.courseTitle ?? 'No course'} ·{' '}
                      {t.dueAt
                        ? new Date(t.dueAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                        : 'No due date'}
                    </p>
                  </div>
                  <PriorityPill priority={t.priority} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent courses</CardTitle>
            <CardDescription>Jump back into what you've been studying.</CardDescription>
          </div>
          <Link href="/courses" className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {data.courses.length === 0 ? (
            <EmptyMini
              icon={BookOpen}
              title="No courses yet"
              text="Create your first course to start tracking progress."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.id}`}
                  className="group rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-accent)]/40"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white"
                      style={{ background: c.color ?? 'var(--color-primary)' }}
                    >
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <p className="truncate text-sm font-medium">{c.title}</p>
                  </div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-xs text-[var(--color-muted-foreground)]">{c.percent}% complete</span>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      {c.status}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.percent}%`, background: c.color ?? 'var(--color-primary)' }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
    medium: 'bg-[var(--color-chart-2)]/15 text-[var(--color-chart-2)]',
    high: 'bg-[var(--color-chart-3)]/15 text-[var(--color-chart-3)]',
    urgent: 'bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[priority] ?? map.medium}`}>
      {priority}
    </span>
  );
}

function EmptyMini({
  icon: Icon,
  title,
  text,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
      {Icon && <Icon className="h-6 w-6 text-[var(--color-muted-foreground)]" />}
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-[var(--color-muted-foreground)]">{text}</p>
    </div>
  );
}