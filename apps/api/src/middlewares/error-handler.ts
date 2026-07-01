import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { ZodError } from 'zod';

/** 404 catcher — keep it last-ish, before the error handler. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
};

/** Central error → JSON. Maps AppError, ZodError, and unknown errors. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: err.flatten(),
      },
    });
    return;
  }
  logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error' },
  });
};