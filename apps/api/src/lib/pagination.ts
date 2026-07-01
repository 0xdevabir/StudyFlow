import type { Cursor, Page } from '@studyflow/shared';

/**
 * Encode a numeric offset or an opaque id into a base64 cursor.
 * For MVP we use timestamp-based cursors on `created_at`.
 */
export function encodeCursor(value: string | Date): Cursor {
  const raw = value instanceof Date ? value.toISOString() : value;
  return Buffer.from(raw, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: Cursor): string | null {
  if (!cursor) return null;
  try {
    return Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function emptyPage<T>(): Page<T> {
  return { data: [], nextCursor: null };
}