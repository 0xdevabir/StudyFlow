/**
 * Single course detail. Shows meta, stats, and the dynamic hierarchy tree.
 */
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ExternalLink, GraduationCap, Layers, ListChecks } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { HierarchyTree } from '~/components/courses/hierarchy-tree';
import { Badge } from '~/components/ui/badge';
import { getCurrentUser } from '~/server/auth';
import { getCourseDetail } from '~/server/courses';

// Node.js runtime — Drizzle needs Node APIs (pg, dotenv).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const data = await getCourseDetail(user.id, id);
  if (!data) notFound();

  const { course: c, tree, stats } = data;
  const color = c.color ?? 'var(--color-primary)';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/courses"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All courses
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: color }}
          >
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{c.title}</h1>
              <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
              <Badge variant="outline">{c.priority}</Badge>
            </div>
            {c.description && (
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted-foreground)]">{c.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              {c.instructor && <span>by {c.instructor}</span>}
              {c.category && (
                <>
                  <span>·</span>
                  <span>{c.category}</span>
                </>
              )}
              {c.url && (
                <>
                  <span>·</span>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[var(--color-foreground)]"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={Layers} label="Nodes" value={stats.nodes} color="bg-[var(--color-chart-1)]/15 text-[var(--color-chart-1)]" />
        <StatCard icon={BookOpen} label="Estimated" value={`${Math.round(c.estimatedMinutes / 60)}h`} color="bg-[var(--color-chart-2)]/15 text-[var(--color-chart-2)]" />
        <StatCard icon={ListChecks} label="Tasks" value={stats.tasks} color="bg-[var(--color-chart-3)]/15 text-[var(--color-chart-3)]" />
        <StatCard icon={GraduationCap} label="Studied" value={`${stats.minutes}m`} color="bg-[var(--color-chart-4)]/15 text-[var(--color-chart-4)]" />
      </div>

      {/* Hierarchy */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Curriculum</CardTitle>
              <CardDescription>
                Add unlimited depth: modules → lessons → topics → sub-topics. Drag to
                reorder, click plus to add a child.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <HierarchyTree
            courseId={c.id}
            nodes={tree.map((n) => ({
              id: n.id,
              parentId: n.parentId,
              path: n.path,
              orderIndex: n.orderIndex,
              type: n.type,
              title: n.title,
              description: n.description,
              url: n.url,
              estimatedMinutes: n.estimatedMinutes,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
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

function statusVariant(s: string): 'default' | 'secondary' | 'outline' {
  if (s === 'completed') return 'secondary';
  if (s === 'archived') return 'outline';
  return 'default';
}