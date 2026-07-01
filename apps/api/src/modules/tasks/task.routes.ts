/**
 * Tasks REST routes. Mounted under /api/v1/tasks.
 *
 *   GET    /                    list (filter + cursor pagination)
 *   POST   /                    create
 *   GET    /:id                 detail
 *   PATCH  /:id                 update
 *   DELETE /:id                 soft delete
 *   POST   /:id/complete        mark complete { actualMinutes? }
 *   POST   /:id/reopen          move back to pending
 *   POST   /reorder             bulk reorder across the kanban columns
 */
import { Router, type Request } from 'express';
import {
  completeTaskSchema,
  createTaskSchema,
  listTasksQuerySchema,
  reorderTasksSchema,
  updateTaskSchema,
  type CompleteTaskInput,
  type CreateTaskInput,
  type ListTasksQuery,
  type ReorderTasksInput,
  type UpdateTaskInput,
} from '@studyflow/shared';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { NotFoundError } from '../../lib/errors.js';
import {
  completeTask,
  createTask,
  getTask,
  listTasks,
  reopenTask,
  reorderTasks,
  softDeleteTask,
  updateTask,
} from './task.repo.js';

export const taskRouter = Router();
taskRouter.use(requireAuth);

const param = (req: Request, key: string): string => {
  const v = req.params[key];
  return typeof v === 'string' ? v : '';
};

taskRouter.get('/', validate(listTasksQuerySchema, 'query'), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const query = req.query as unknown as ListTasksQuery;
    const result = await listTasks(ownerId, query);
    res.json({
      data: result.data,
      page: { nextCursor: result.nextCursor, total: result.total },
    });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/', validate(createTaskSchema), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const body = req.body as CreateTaskInput;
    const row = await createTask(ownerId, body);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

taskRouter.get('/:id', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const row = await getTask(ownerId, id);
    if (!row) throw new NotFoundError('Task');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

taskRouter.patch('/:id', validate(updateTaskSchema), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const body = req.body as UpdateTaskInput;
    const row = await updateTask(ownerId, id, body);
    if (!row) throw new NotFoundError('Task');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

taskRouter.delete('/:id', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const ok = await softDeleteTask(ownerId, id);
    if (!ok) throw new NotFoundError('Task');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/:id/complete', validate(completeTaskSchema), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const body = (req.body ?? {}) as CompleteTaskInput;
    const row = await completeTask(ownerId, id, body.actualMinutes);
    if (!row) throw new NotFoundError('Task');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/:id/reopen', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const row = await reopenTask(ownerId, id);
    if (!row) throw new NotFoundError('Task');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/reorder', validate(reorderTasksSchema), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const body = req.body as ReorderTasksInput;
    const result = await reorderTasks(ownerId, body.columns);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});