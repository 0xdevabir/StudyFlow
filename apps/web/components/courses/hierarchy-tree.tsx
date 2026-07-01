'use client';
/**
 * Dynamic course hierarchy tree.
 *
 * - Recursive, unbounded depth (clamped to 12 by the server).
 * - Drag & drop reorder of siblings (HTML5 drag, no extra deps).
 * - Drag onto a node = move under that node (any depth).
 * - Inline add child, inline rename, delete.
 * - Optimistic UI; rolls back on error.
 */
import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { api, ApiClientError } from '~/lib/api-client';
import { cn } from '~/lib/utils';

export interface TreeNode {
  id: string;
  parentId: string | null;
  path: string;
  orderIndex: number;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  estimatedMinutes: number;
}

interface Props {
  courseId: string;
  nodes: TreeNode[];
}

interface LocalNode extends TreeNode {
  children: LocalNode[];
}

function buildTree(nodes: TreeNode[]): LocalNode[] {
  const map = new Map<string, LocalNode>();
  for (const n of nodes) map.set(n.id, { ...n, children: [] });
  const roots: LocalNode[] = [];
  for (const n of nodes) {
    const local = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(local);
    } else {
      roots.push(local);
    }
  }
  const sortRec = (list: LocalNode[]) => {
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function HierarchyTree({ courseId, nodes }: Props) {
  const [tree, setTree] = React.useState<LocalNode[]>(() => buildTree(nodes));
  const [error, setError] = React.useState<string | null>(null);

  // Reset if the server data changes (e.g. after router.refresh()).
  React.useEffect(() => {
    setTree(buildTree(nodes));
  }, [nodes]);

  const refresh = React.useCallback(() => {
    // Trigger parent server re-render to fetch fresh data.
    window.location.reload();
  }, []);

  const onAddRoot = async () => {
    const title = window.prompt('Root item title?');
    if (!title?.trim()) return;
    const type = window.prompt('Type label? (module / lesson / topic / chapter / week / …)', 'module') ?? 'module';
    try {
      const created = await api.post<TreeNode>(`/api/v1/courses/${courseId}/hierarchy`, {
        parentId: null,
        title: title.trim(),
        type: type.trim() || 'module',
      });
      setTree((t) => [...t, { ...created, children: [] }]);
    } catch (err) {
      setError(toMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-[var(--color-destructive)]/10 px-3 py-2 text-xs text-[var(--color-destructive)]">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAddRoot}>
          <Plus className="h-3.5 w-3.5" /> Add root
        </Button>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Drag to reorder. Drop onto another item to make it a child.
        </p>
      </div>

      {tree.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-sm font-medium">No curriculum yet</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Add modules, lessons, topics — anything that fits how you learn.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              courseId={courseId}
              setError={setError}
              onMutated={refresh}
              onLocalChange={setTree}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface TreeRowProps {
  node: LocalNode;
  depth: number;
  courseId: string;
  setError: (msg: string | null) => void;
  onMutated: () => void;
  onLocalChange: React.Dispatch<React.SetStateAction<LocalNode[]>>;
}

function TreeRow({ node, depth, courseId, setError, onMutated, onLocalChange }: TreeRowProps) {
  const [expanded, setExpanded] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(node.title);
  const [addingChild, setAddingChild] = React.useState(false);
  const [childTitle, setChildTitle] = React.useState('');
  const [childType, setChildType] = React.useState('item');
  const [dragging, setDragging] = React.useState(false);
  const [dragOver, setDragOver] = React.useState<false | 'before' | 'inside' | 'after'>(false);

  const hasChildren = node.children.length > 0;

  async function commitRename() {
    const title = draftTitle.trim();
    setEditing(false);
    if (!title || title === node.title) {
      setDraftTitle(node.title);
      return;
    }
    try {
      const updated = await api.patch<TreeNode>(
        `/api/v1/courses/${courseId}/hierarchy/${node.id}`,
        { title },
      );
      onLocalChange((t) => replaceNode(t, node.id, { ...node, ...updated }));
    } catch (err) {
      setError(toMessage(err));
      setDraftTitle(node.title);
    }
  }

  async function addChild() {
    const title = childTitle.trim();
    if (!title) {
      setAddingChild(false);
      return;
    }
    try {
      const created = await api.post<TreeNode>(
        `/api/v1/courses/${courseId}/hierarchy`,
        { parentId: node.id, title, type: childType.trim() || 'item' },
      );
      onLocalChange((t) => replaceNode(t, node.id, { ...node, children: [...node.children, { ...created, children: [] }] }));
      setChildTitle('');
      setChildType('item');
      setAddingChild(false);
      setExpanded(true);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function remove() {
    if (!confirm(`Delete "${node.title}" and all its descendants?`)) return;
    try {
      await api.delete(`/api/v1/courses/${courseId}/hierarchy/${node.id}`);
      onLocalChange((t) => removeNode(t, node.id));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  // Drag handlers — sibling reorder + drop into another node.
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  }
  function onDragEnd() {
    setDragging(false);
    setDragOver(false);
  }
  function onDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Determine drop zone: top 25% = before, middle 50% = inside, bottom 25% = after.
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const h = rect.height;
      const zone: 'before' | 'inside' | 'after' =
        y < h * 0.25 ? 'before' : y > h * 0.75 ? 'after' : 'inside';
      setDragOver(zone);
    }
  }
  function onDragLeave() {
    setDragOver(false);
  }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    const zone = dragOver;
    setDragOver(false);
    setDragging(false);
    if (!draggedId || draggedId === node.id) return;

    // If dropping inside another node, just call /move with parentId = target.
    if (zone === 'inside') {
      try {
        await api.post(`/api/v1/courses/${courseId}/hierarchy/${draggedId}/move`, {
          parentId: node.id,
          position: 0,
        });
        onMutated();
      } catch (err) {
        setError(toMessage(err));
      }
      return;
    }

    // Otherwise reorder: move dragged item to be before/after this node
    // within the same parent. We ask the server to move it to parent of
    // this node, at the appropriate position.
    try {
      const siblingsBefore = await listSiblingIds(courseId, node.parentId);
      const idx = siblingsBefore.indexOf(node.id);
      const position = zone === 'before' ? idx : idx + 1;
      await api.post(`/api/v1/courses/${courseId}/hierarchy/${draggedId}/move`, {
        parentId: node.parentId,
        position,
      });
      onMutated();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'rounded-md',
        dragging && 'opacity-50',
        dragOver === 'inside' && 'bg-[var(--color-accent)]/50 ring-1 ring-[var(--color-primary)]/40',
        dragOver === 'before' && 'border-t-2 border-[var(--color-primary)]',
        dragOver === 'after' && 'border-b-2 border-[var(--color-primary)]',
      )}
    >
      <div
        className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-[var(--color-accent)]/40"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="block h-1.5 w-1.5 rounded-full bg-[var(--color-border)]" />
          )}
        </button>

        <span className="text-[var(--color-muted-foreground)]">
          {hasChildren ? (
            expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
        </span>

        <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {node.type}
        </span>

        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraftTitle(node.title);
                setEditing(false);
              }
            }}
            className="ml-1 flex-1 rounded border border-[var(--color-border)] bg-transparent px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        ) : (
          <button
            className="ml-1 flex-1 truncate text-left text-sm"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {node.title}
          </button>
        )}

        {node.estimatedMinutes > 0 && (
          <span className="rounded-full bg-[var(--color-chart-3)]/15 px-2 py-0.5 text-[10px] text-[var(--color-chart-3)]">
            {node.estimatedMinutes}m
          </span>
        )}

        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            onClick={(e) => e.stopPropagation()}
            title="Open URL"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => setAddingChild(true)}>
              <Plus className="h-3.5 w-3.5" /> Add child
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={remove}
              className="text-[var(--color-destructive)] focus:text-[var(--color-destructive)]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {addingChild && (
        <div
          className="ml-8 mt-1 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/50 p-2"
          style={{ marginLeft: `${depth * 20 + 36}px` }}
        >
          <input
            placeholder="Type label (module, lesson…)"
            value={childType}
            onChange={(e) => setChildType(e.target.value)}
            className="w-32 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
          />
          <input
            autoFocus
            placeholder="Title"
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addChild();
              if (e.key === 'Escape') {
                setAddingChild(false);
                setChildTitle('');
              }
            }}
            className="flex-1 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={addChild}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAddingChild(false); setChildTitle(''); }}>Cancel</Button>
        </div>
      )}

      {expanded && hasChildren && (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              courseId={courseId}
              setError={setError}
              onMutated={onMutated}
              onLocalChange={(updater) =>
                onLocalChange((t) => replaceNode(t, node.id, { ...node, children: applyUpdater(node.children, updater) }))
              }
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function applyUpdater(list: LocalNode[], updater: React.SetStateAction<LocalNode[]>): LocalNode[] {
  return typeof updater === 'function'
    ? (updater as (prev: LocalNode[]) => LocalNode[])(list)
    : updater;
}

function replaceNode(list: LocalNode[], id: string, replacement: LocalNode): LocalNode[] {
  return list.map((n) => {
    if (n.id === id) return replacement;
    if (n.children.length > 0) return { ...n, children: replaceNode(n.children, id, replacement) };
    return n;
  });
}

function removeNode(list: LocalNode[], id: string): LocalNode[] {
  return list
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNode(n.children, id) }));
}

async function listSiblingIds(courseId: string, parentId: string | null): Promise<string[]> {
  const tree = await api.get<{ tree: TreeNode[] }>(`/api/v1/courses/${courseId}/hierarchy`);
  return tree.tree
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.path.localeCompare(b.path) || a.orderIndex - b.orderIndex)
    .map((n) => n.id);
}

function toMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}