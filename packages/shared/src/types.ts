/**
 * Generic utility types shared across the API and web.
 */

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type Cursor = string | null;

export interface Page<T> {
  data: T[];
  nextCursor: Cursor;
  total?: number;
}

export interface PaginationInput {
  cursor?: Cursor;
  limit?: number;
}

export type ID = string;

export type ISODateString = string;

export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };