import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

/** Adds `req.id` and the `X-Request-Id` header for trace propagation. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[a-zA-Z0-9-]{6,80}$/.test(incoming) ? incoming : randomUUID();
  (req as { id?: string }).id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
