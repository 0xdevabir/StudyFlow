/**
 * Typed fetch wrapper used by TanStack Query. Includes Next's revalidation
 * cookie automatically. Errors are normalised to `ApiClientError`.
 */
import { env } from './env';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(status: number, body: ApiError) {
    super(body.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: ApiError };
  if (!res.ok) {
    throw new ApiClientError(res.status, json.error ?? { code: 'NETWORK', message: res.statusText });
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};