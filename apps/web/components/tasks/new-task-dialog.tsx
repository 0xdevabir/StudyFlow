'use client';
/**
 * "New / Edit task" dialog. Hand-rolled modal matching the NewCourseDialog
 * style — keeps the dependency footprint small. Supports both create and
 * edit modes; the parent passes the existing task when editing.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { api, ApiClientError } from '~/lib/api-client';
import {
  type TaskCardData,
} from './task-card';

type Status = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TaskType = 'assignment' | 'quiz' | 'practice' | 'revision' | 'exam' | 'custom';

interface CourseOption {
  id: string;
  title: string;
}

interface NewTaskDialogProps {
  /** When provided, the dialog opens in "edit" mode for this task. */
  task?: TaskCardData;
  /** Available courses for the course selector. */
  courses?: CourseOption[];
  /** Trigger label override; defaults to "New task". */
  label?: string;
}

function toLocalDateTimeInput(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '';
  // `datetime-local` needs YYYY-MM-DDTHH:MM (local time).
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewTaskDialog({ task, courses = [], label }: NewTaskDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEdit = Boolean(task);
  const [type, setType] = React.useState<TaskType>((task?.type as TaskType) ?? 'custom');
  const [status, setStatus] = React.useState<Status>((task?.status as Status) ?? 'pending');
  const [priority, setPriority] = React.useState<Priority>(
    (task?.priority as Priority) ?? 'medium',
  );
  const [courseId, setCourseId] = React.useState<string>(task?.courseId ?? '');

  // Reset local form state whenever the dialog opens or the task prop changes.
  React.useEffect(() => {
    if (!open) return;
    setType((task?.type as TaskType) ?? 'custom');
    setStatus((task?.status as Status) ?? 'pending');
    setPriority((task?.priority as Priority) ?? 'medium');
    setCourseId(task?.courseId ?? '');
    setError(null);
  }, [open, task]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) {
      setError('Title is required');
      return;
    }
    const dueRaw = String(form.get('dueAt') ?? '').trim();
    const dueIso = dueRaw ? new Date(dueRaw).toISOString() : undefined;
    const estimateRaw = String(form.get('estimateMinutes') ?? '').trim();
    const estimate = estimateRaw ? Math.max(0, parseInt(estimateRaw, 10) || 0) : 0;

    const payload = {
      title,
      description: String(form.get('description') ?? '').trim() || undefined,
      type,
      status,
      priority,
      courseId: courseId || undefined,
      dueAt: dueIso,
      estimateMinutes: estimate,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && task) {
        await api.patch(`/api/v1/tasks/${task.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/api/v1/tasks', payload);
        toast.success('Task created');
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError(isEdit ? 'Failed to update task' : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={isEdit ? 'ghost' : 'default'}
        size={isEdit ? 'sm' : 'default'}
      >
        {isEdit ? (
          'Edit'
        ) : (
          <>
            <Plus className="h-4 w-4" />
            {label ?? 'New task'}
          </>
        )}
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
            <h2 className="text-lg font-semibold tracking-tight">
              {isEdit ? 'Edit task' : 'Create a new task'}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {isEdit
                ? 'Update the task details below.'
                : 'A small unit of work you want to come back to.'}
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  maxLength={240}
                  placeholder="e.g. Finish chapter 3 exercises"
                  defaultValue={task?.title ?? ''}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={4000}
                  placeholder="Optional — any context you'll need later."
                  defaultValue={task?.description ?? ''}
                  className="mt-2 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as TaskType)}
                    className="mt-2 h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="practice">Practice</option>
                    <option value="revision">Revision</option>
                    <option value="exam">Exam</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="mt-2 h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="mt-2 h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="courseId">Course</Label>
                  <select
                    id="courseId"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="mt-2 h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                  >
                    <option value="">No course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dueAt">Due date</Label>
                  <Input
                    id="dueAt"
                    name="dueAt"
                    type="datetime-local"
                    defaultValue={toLocalDateTimeInput(task?.dueAt)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="estimateMinutes">Estimate (min)</Label>
                  <Input
                    id="estimateMinutes"
                    name="estimateMinutes"
                    type="number"
                    min={0}
                    max={100000}
                    defaultValue={task?.estimateMinutes ?? 0}
                    className="mt-2"
                  />
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
                  {submitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}