/**
 * Courses index — grid of all courses with filters and a "new course" dialog.
 * Server component fetches the initial list, then the client component handles
 * mutations and refreshes via router.refresh().
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, BookOpen, GraduationCap } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { CourseGrid } from '~/components/courses/course-grid';
import { CourseFilters } from '~/components/courses/course-filters';
import { NewCourseDialog } from '~/components/courses/new-course-dialog';
import { getCurrentUser } from '~/server/auth';
import { listCourses } from '~/server/courses';

// Node.js runtime — Drizzle needs Node APIs (pg, dotenv).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{
    q?: string;
    status?: 'active' | 'paused' | 'completed' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    includeArchived?: 'true';
  }>;
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sp = (await searchParams) ?? {};
  const courses = await listCourses(user.id, {
    q: sp.q,
    status: sp.status,
    priority: sp.priority,
    includeArchived: sp.includeArchived === 'true',
  });

  const activeCount = courses.filter((c) => c.status === 'active').length;
  const completedCount = courses.filter((c) => c.status === 'completed').length;
  const totalMinutes = courses.reduce((acc, c) => acc + c.totalMinutes, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">Your library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Courses</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--color-muted-foreground)]">
            Anything you learn lives here — university modules, YouTube playlists, books,
            bootcamps, custom roadmaps. Model the structure however it makes sense to you.
          </p>
        </div>
        <NewCourseDialog />
      </div>

      {/* Mini summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={GraduationCap} label="Active" value={activeCount} accent="bg-[var(--color-chart-1)]/15 text-[var(--color-chart-1)]" />
        <SummaryCard icon={BookOpen} label="Completed" value={completedCount} accent="bg-[var(--color-chart-2)]/15 text-[var(--color-chart-2)]" />
        <SummaryCard icon={ArrowUpRight} label="Minutes studied" value={totalMinutes.toLocaleString()} accent="bg-[var(--color-chart-3)]/15 text-[var(--color-chart-3)]" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <CourseFilters />
        </CardContent>
      </Card>

      {/* List */}
      {courses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No courses match your filters</CardTitle>
            <CardDescription>Try clearing filters, or create your first course.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-3 py-10">
              <NewCourseDialog />
              <Button variant="ghost" asChild>
                <Link href="/courses">Clear filters</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CourseGrid courses={courses} />
      )}
    </div>
  );
}

function SummaryCard({
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
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}