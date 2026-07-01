/**
 * Courses + Hierarchy REST routes. Mounted under /api/v1/courses.
 *
 *   GET    /                          list courses (filter + cursor pagination)
 *   POST   /                          create
 *   GET    /:id                       detail
 *   PATCH  /:id                       update
 *   DELETE /:id                       soft delete
 *   POST   /:id/archive               { archived: boolean }
 *   POST   /:id/duplicate             create a copy
 *   GET    /:id/stats                 aggregate stats
 *
 *   GET    /:id/hierarchy             full tree
 *   POST   /:id/hierarchy             create node { parentId?, type, title, ... }
 *   PATCH  /:id/hierarchy/:nodeId     update node fields
 *   DELETE /:id/hierarchy/:nodeId     soft delete node
 *   POST   /:id/hierarchy/:nodeId/move  { parentId, position }
 *   POST   /:id/hierarchy/reorder     { parentId, orderedIds: [] }
 */
import { Router, type Request } from 'express';
import {
  createCourseSchema,
  createHierarchyNodeSchema,
  listCoursesQuerySchema,
  moveHierarchyNodeSchema,
  reorderHierarchySchema,
  updateCourseSchema,
  updateHierarchyNodeSchema,
} from '@studyflow/shared';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../lib/errors.js';
import {
  archiveCourse,
  buildUniqueSlug,
  createCourse,
  duplicateCourse,
  getCourse,
  getCourseStats,
  listCourses,
  softDeleteCourse,
  updateCourse,
  updateCourseSlug,
} from './course.repo.js';
import {
  HierarchyDomainError,
  createNode,
  getNode,
  listTree,
  moveNode,
  ownerOwnsCourse,
  reorderSiblings,
  rollup,
  softDeleteNode,
  updateNode,
} from './hierarchy.repo.js';

export const courseRouter = Router();
courseRouter.use(requireAuth);

const param = (req: Request, key: string): string => {
  const v = req.params[key];
  return typeof v === 'string' ? v : '';
};

/* -------------------------------------------------------------------------- */
/*                              Course CRUD                                    */
/* -------------------------------------------------------------------------- */

courseRouter.get('/', validate(listCoursesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const query = req.query as unknown as Parameters<typeof listCourses>[1];
    const result = await listCourses(ownerId, query);
    res.json({
      data: result.data,
      page: { nextCursor: result.nextCursor, total: result.total },
    });
  } catch (err) {
    next(err);
  }
});

courseRouter.post('/', validate(createCourseSchema), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const body = req.body as Parameters<typeof createCourse>[2];
    const slug = await buildUniqueSlug(ownerId, body.title);
    const row = await createCourse(ownerId, slug, body);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

courseRouter.get('/:id', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const row = await getCourse(ownerId, id);
    if (!row) throw new NotFoundError('Course');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

courseRouter.patch('/:id', validate(updateCourseSchema), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const body = req.body as Parameters<typeof updateCourse>[2];
    let slug: string | undefined;
    if (body.title) {
      slug = await buildUniqueSlug(ownerId, body.title, id);
    }
    const row = await updateCourse(ownerId, id, body);
    if (!row) throw new NotFoundError('Course');
    if (slug) {
      await updateCourseSlug(ownerId, id, slug);
      row.slug = slug;
    }
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

courseRouter.delete('/:id', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const ok = await softDeleteCourse(ownerId, id);
    if (!ok) throw new NotFoundError('Course');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

courseRouter.post('/:id/archive', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const body = (req.body ?? {}) as { archived?: boolean };
    const archived = body.archived !== false; // default true
    const row = await archiveCourse(ownerId, id, archived);
    if (!row) throw new NotFoundError('Course');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

courseRouter.post('/:id/duplicate', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const original = await getCourse(ownerId, id);
    if (!original) throw new NotFoundError('Course');
    const newTitle = `${original.title} (Copy)`;
    const newSlug = await buildUniqueSlug(ownerId, newTitle);
    const row = await duplicateCourse(ownerId, id, newSlug, newTitle);
    if (!row) throw new NotFoundError('Course');
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

courseRouter.get('/:id/stats', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const id = param(req, 'id');
    const stats = await getCourseStats(ownerId, id);
    if (!stats) throw new NotFoundError('Course');
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/*                              Hierarchy                                      */
/* -------------------------------------------------------------------------- */

courseRouter.get('/:id/hierarchy', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const courseId = param(req, 'id');
    if (!(await ownerOwnsCourse(ownerId, courseId))) throw new ForbiddenError();
    const tree = await listTree(courseId);
    const summary = await rollup(courseId);
    res.json({ data: { tree, summary } });
  } catch (err) {
    next(mapHierarchyError(err));
  }
});

courseRouter.post(
  '/:id/hierarchy',
  validate(createHierarchyNodeSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const courseId = param(req, 'id');
      if (!(await ownerOwnsCourse(ownerId, courseId))) throw new ForbiddenError();
      const body = req.body as Parameters<typeof createNode>[2];
      const row = await createNode(courseId, body.parentId ?? null, body);
      res.status(201).json({ data: row });
    } catch (err) {
      next(mapHierarchyError(err));
    }
  },
);

courseRouter.patch(
  '/:id/hierarchy/:nodeId',
  validate(updateHierarchyNodeSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const courseId = param(req, 'id');
      const nodeId = param(req, 'nodeId');
      if (!(await ownerOwnsCourse(ownerId, courseId))) throw new ForbiddenError();
      const node = await getNode(courseId, nodeId);
      if (!node) throw new NotFoundError('Hierarchy node');
      const body = req.body as Parameters<typeof updateNode>[2];
      const row = await updateNode(courseId, nodeId, body);
      if (!row) throw new NotFoundError('Hierarchy node');
      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  },
);

courseRouter.delete('/:id/hierarchy/:nodeId', async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const courseId = param(req, 'id');
    const nodeId = param(req, 'nodeId');
    if (!(await ownerOwnsCourse(ownerId, courseId))) throw new ForbiddenError();
    const ok = await softDeleteNode(courseId, nodeId);
    if (!ok) throw new NotFoundError('Hierarchy node');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

courseRouter.post(
  '/:id/hierarchy/:nodeId/move',
  validate(moveHierarchyNodeSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const courseId = param(req, 'id');
      const nodeId = param(req, 'nodeId');
      if (!(await ownerOwnsCourse(ownerId, courseId))) throw new ForbiddenError();
      const body = req.body as Parameters<typeof moveNode>[2];
      const row = await moveNode(courseId, nodeId, body);
      if (!row) throw new BadRequestError('Invalid move (cycle or missing parent)');
      res.json({ data: row });
    } catch (err) {
      next(mapHierarchyError(err));
    }
  },
);

courseRouter.post(
  '/:id/hierarchy/reorder',
  validate(reorderHierarchySchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const courseId = param(req, 'id');
      if (!(await ownerOwnsCourse(ownerId, courseId))) throw new ForbiddenError();
      const body = req.body as { parentId?: string | null; orderedIds: string[] };
      const rows = await reorderSiblings(courseId, body.parentId ?? null, body.orderedIds);
      res.json({ data: rows });
    } catch (err) {
      next(mapHierarchyError(err));
    }
  },
);

function mapHierarchyError(err: unknown): unknown {
  if (err instanceof HierarchyDomainError) {
    switch (err.code) {
      case 'DEPTH_LIMIT':
        return new BadRequestError(err.message);
      case 'PARENT_NOT_FOUND':
        return new NotFoundError('Parent hierarchy node');
      case 'INVALID_REORDER':
        return new BadRequestError(err.message);
      default:
        return err;
    }
  }
  return err;
}