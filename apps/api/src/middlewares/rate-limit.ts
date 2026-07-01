import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { RATE_LIMITS } from '@studyflow/shared';

function make(opts: { windowMs: number; max: number }): Options {
  return {
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req.ip ?? 'unknown') + ':' + (req.originalUrl || ''),
  } as unknown as Options;
}

export const globalRateLimit = rateLimit(
  make({ windowMs: RATE_LIMITS.global.windowMs, max: RATE_LIMITS.global.max }),
);

export const authRateLimit = rateLimit(
  make({ windowMs: RATE_LIMITS.auth.windowMs, max: RATE_LIMITS.auth.max }),
);
