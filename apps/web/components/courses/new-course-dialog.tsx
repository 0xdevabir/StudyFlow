'use client';
/**
 * "New course" dialog — opens a shadcn-style dialog with a React Hook Form.
 * We use lightweight controlled inputs here rather than RHF+Zod to keep
 * the dependency footprint small; Zod still validates server-side.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { api, ApiClientError } from '~/lib/api-client';

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#EF4444',
];

export function NewCourseDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [color, setColor] = React.useState(PRESET_COLORS[0]!);
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      title: String(form.get('title') ?? '').trim(),
      description: String(form.get('description') ?? '').trim() || undefined,
      category: String(form.get('category') ?? '').trim() || undefined,
      instructor: String(form.get('instructor') ?? '').trim() || undefined,
      url: String(form.get('url') ?? '').trim() || undefined,
      color,
      priority,
    };
    if (!payload.title) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>('/api/v1/courses', payload);
      setOpen(false);
      router.push(`/courses/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError('Failed to create course');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New course
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">Create a new course</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              You can add a hierarchy of modules, lessons, topics, and more on the next screen.
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required maxLength={200} placeholder="e.g. Complete React Developer" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input id="instructor" name="instructor" placeholder="Andrei Neagoie" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" placeholder="Programming" />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="What's this course about?" />
              </div>

              <div>
                <Label htmlFor="url">URL</Label>
                <Input id="url" name="url" type="url" placeholder="https://…" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Color</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-6 w-6 rounded-md transition-transform ${
                          color === c ? 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110' : ''
                        }`}
                        style={{ background: c }}
                        aria-label={`Pick color ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="mt-2 h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-[var(--color-destructive)]/10 px-3 py-2 text-xs text-[var(--color-destructive)]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create course'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}