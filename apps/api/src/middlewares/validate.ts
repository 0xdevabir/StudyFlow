import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { ValidationError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Express middleware factory that validates `req[source]` against a Zod
 * schema and replaces it with the parsed (typed) value.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    try {
      const data = (schema as z.ZodTypeAny).parse(req[source]);
      // Express 5 typing: `req.query` is read-only but assignable via this trick.
      (req as unknown as Record<Source, unknown>)[source] = data;
      next();
    } catch (err) {
      if (err instanceof Error && 'issues' in err) {
        next(new ValidationError((err as { issues: unknown }).issues));
        return;
      }
      next(err);
    }
  };