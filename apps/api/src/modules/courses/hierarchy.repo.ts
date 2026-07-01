/**
 * Hierarchy repository — works against `course_hierarchy`. Owns path/ordering.
 *
 * The schema has a `path` (materialized) text column of the form
 *   "<uuid>.<uuid>.<uuid>"
 * for nested nodes (root nodes store just "<uuid>"). Depth is the number of
 * '.' separators. We maintain `path` from application code rather than a
 * trigger: easy to reason about, easy to test, no migration coupling.
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { course, courseHierarchy } from '@studyflow/db/schema';
import type {
  CreateHierarchyNodeInput,
  MoveHierarchyNodeInput,
  UpdateHierarchyNodeInput,
} from '@studyflow/shared';

export type HierarchyRow = typeof courseHierarchy.$inferSelect;

const SEP = '.';
const MAX_DEPTH = 12;

export class HierarchyDomainError extends Error {
  public readonly code: string;
  public readonly status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function ownerOwnsCourse(ownerId: string, courseId: string): Promise<boolean> {
  const rows = await db
    .select({ id: course.id })
    .from(course)
    .where(
      and(
        eq(course.id, courseId),
        eq(course.ownerId, ownerId),
        isNull(course.deletedAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Children of a given parent (or root when parentId === null). */
export async function listChildren(
  courseId: string,
  parentId: string | null,
): Promise<HierarchyRow[]> {
  const where =
    parentId === null
      ? and(
          eq(courseHierarchy.courseId, courseId),
          isNull(courseHierarchy.parentId),
          isNull(courseHierarchy.deletedAt),
        )
      : and(
          eq(courseHierarchy.courseId, courseId),
          eq(courseHierarchy.parentId, parentId),
          isNull(courseHierarchy.deletedAt),
        );
  return db
    .select()
    .from(courseHierarchy)
    .where(where)
    .orderBy(asc(courseHierarchy.orderIndex), asc(courseHierarchy.createdAt));
}

/** Whole tree of a course, ordered deterministically. */
export async function listTree(courseId: string): Promise<HierarchyRow[]> {
  return db
    .select()
    .from(courseHierarchy)
    .where(and(eq(courseHierarchy.courseId, courseId), isNull(courseHierarchy.deletedAt)))
    .orderBy(asc(courseHierarchy.path), asc(courseHierarchy.orderIndex));
}

export async function getNode(courseId: string, id: string): Promise<HierarchyRow | null> {
  const rows = await db
    .select()
    .from(courseHierarchy)
    .where(and(eq(courseHierarchy.id, id), eq(courseHierarchy.courseId, courseId)))
    .limit(1);
  return rows[0] ?? null;
}

function depthOf(node: HierarchyRow | null): number {
  if (!node) return 0;
  return node.path ? node.path.split(SEP).length : 0;
}

function clampDepth(parent: HierarchyRow | null): void {
  const depth = depthOf(parent) + 1; // child depth
  if (depth > MAX_DEPTH) {
    throw new HierarchyDomainError(
      'DEPTH_LIMIT',
      422,
      `Hierarchy depth limit (${MAX_DEPTH}) exceeded`,
    );
  }
}

async function nextOrderIndex(courseId: string, parentId: string | null): Promise<number> {
  const where =
    parentId === null
      ? and(
          eq(courseHierarchy.courseId, courseId),
          isNull(courseHierarchy.parentId),
          isNull(courseHierarchy.deletedAt),
        )
      : and(
          eq(courseHierarchy.courseId, courseId),
          eq(courseHierarchy.parentId, parentId),
          isNull(courseHierarchy.deletedAt),
        );
  const rows = await db
    .select({
      max: sql<number>`coalesce(max(${courseHierarchy.orderIndex}), -1)::int`,
    })
    .from(courseHierarchy)
    .where(where);
  return Number(rows[0]?.max ?? -1) + 1;
}

export async function createNode(
  courseId: string,
  parentId: string | null,
  input: CreateHierarchyNodeInput,
): Promise<HierarchyRow> {
  const parent = parentId ? await getNode(courseId, parentId) : null;
  if (parentId && !parent) {
    throw new HierarchyDomainError('PARENT_NOT_FOUND', 404, 'Parent not found');
  }
  clampDepth(parent);

  const orderIndex =
    typeof input.orderIndex === 'number'
      ? input.orderIndex
      : await nextOrderIndex(courseId, parentId);

  const [row] = await db
    .insert(courseHierarchy)
    .values({
      courseId,
      parentId: parentId ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      url: input.url || null,
      estimatedMinutes: input.estimatedMinutes ?? 0,
      orderIndex,
      // path filled in below; trigger would also work but we keep app logic.
      path: '',
    })
    .returning();
  if (!row) throw new Error('Failed to create node');

  const parentPath = parent?.path ?? '';
  const newPath = parentPath ? `${parentPath}${SEP}${row.id}` : row.id;
  const [updated] = await db
    .update(courseHierarchy)
    .set({ path: newPath })
    .where(eq(courseHierarchy.id, row.id))
    .returning();
  return updated ?? row;
}

export async function updateNode(
  courseId: string,
  id: string,
  patch: UpdateHierarchyNodeInput,
): Promise<HierarchyRow | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.type !== undefined) updates.type = patch.type;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.url !== undefined) updates.url = patch.url;
  if (patch.estimatedMinutes !== undefined) updates.estimatedMinutes = patch.estimatedMinutes;
  // parentId/orderIndex changes go through `moveNode` to keep paths consistent.

  const [row] = await db
    .update(courseHierarchy)
    .set(updates)
    .where(
      and(
        eq(courseHierarchy.id, id),
        eq(courseHierarchy.courseId, courseId),
        isNull(courseHierarchy.deletedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function softDeleteNode(courseId: string, id: string): Promise<boolean> {
  const res = await db
    .update(courseHierarchy)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(courseHierarchy.id, id),
        eq(courseHierarchy.courseId, courseId),
        isNull(courseHierarchy.deletedAt),
      ),
    )
    .returning();
  return res.length > 0;
}

/** Move a node to a new parent / position (and re-derive its subtree paths). */
export async function moveNode(
  courseId: string,
  id: string,
  target: MoveHierarchyNodeInput,
): Promise<HierarchyRow | null> {
  const node = await getNode(courseId, id);
  if (!node) return null;

  // Cannot move under self or descendant.
  if (target.parentId === id) return null;
  let newParent: HierarchyRow | null = null;
  if (target.parentId) {
    newParent = await getNode(courseId, target.parentId);
    if (!newParent) return null;
    if (newParent.path && newParent.path.startsWith(node.path + SEP)) return null;
    clampDepth(newParent);
  } else {
    clampDepth(null);
  }

  // Build the new sibling order for the target parent.
  const siblings = await listChildren(courseId, target.parentId);
  const filtered = siblings.filter((s) => s.id !== id);
  const pos = Math.max(0, Math.min(target.position, filtered.length));
  const reordered = [...filtered.slice(0, pos), node, ...filtered.slice(pos)];

  // Update parent + order for the moved row.
  await db
    .update(courseHierarchy)
    .set({ parentId: target.parentId, orderIndex: pos, updatedAt: new Date() })
    .where(eq(courseHierarchy.id, id));

  // Reorder the siblings we passed over (skip moved row).
  for (let i = 0; i < reordered.length; i += 1) {
    const row = reordered[i];
    if (!row || row.id === id) continue;
    await db
      .update(courseHierarchy)
      .set({ orderIndex: i, updatedAt: new Date() })
      .where(eq(courseHierarchy.id, row.id));
  }

  // Refresh the moved node's path and propagate to descendants.
  const refreshed = await getNode(courseId, id);
  if (!refreshed) return null;
  const parentPath = newParent?.path ?? '';
  const newPath = parentPath ? `${parentPath}${SEP}${refreshed.id}` : refreshed.id;

  await db
    .update(courseHierarchy)
    .set({ path: newPath })
    .where(eq(courseHierarchy.id, id));

  const oldPrefix = node.path + SEP;
  if (oldPrefix !== SEP) {
    await db.execute(sql`
      UPDATE course_hierarchy
         SET path = ${newPath} || substring(path FROM ${(oldPrefix.length + 1).toString()}::int),
             updated_at = now()
       WHERE course_id = ${courseId}::uuid
         AND deleted_at IS NULL
         AND path LIKE ${oldPrefix + '%'}
    `);
  }

  return getNode(courseId, id);
}

export async function reorderSiblings(
  courseId: string,
  parentId: string | null,
  orderedIds: string[],
): Promise<HierarchyRow[]> {
  const all = await listChildren(courseId, parentId);
  const map = new Map(all.map((n) => [n.id, n]));

  const validIds = orderedIds.filter((id) => map.has(id));
  if (validIds.length !== all.length || validIds.length !== orderedIds.length) {
    throw new HierarchyDomainError(
      'INVALID_REORDER',
      422,
      'Sibling set mismatch on reorder',
    );
  }

  for (let i = 0; i < validIds.length; i += 1) {
    const id = validIds[i];
    if (!id) continue;
    await db
      .update(courseHierarchy)
      .set({ orderIndex: i, updatedAt: new Date() })
      .where(eq(courseHierarchy.id, id));
  }
  return listChildren(courseId, parentId);
}

/** Aggregate progress: counts + total estimated minutes. */
export async function rollup(courseId: string) {
  const nodes = await listTree(courseId);
  const totalMinutes = nodes.reduce((acc, n) => acc + (n.estimatedMinutes ?? 0), 0);
  return {
    nodeCount: nodes.length,
    totalMinutes,
  };
}

export async function nodesByIds(ids: string[]): Promise<HierarchyRow[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(courseHierarchy)
    .where(inArray(courseHierarchy.id, ids));
}