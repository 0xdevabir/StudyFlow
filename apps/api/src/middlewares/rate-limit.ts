import rateLimit, { type Options } from 'express-rate-limit';
import { config } from '../lib/env.js';
import { RATE_LIMITS } from '@studyflow/shared';

function make(opts: { windowMs: number; max: number }): Options {
  return {
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => (req.ip ?? 'unknown') + ':' + (req.originalUrl || ''),
  };
}

export const globalRateLimit = rateLimit(
  make({ windowMs: RATE_LIMITS.global.windowMs, max: RATE_LIMITS.global.max }),
);

export const authRateLimit = rateLimit(
  make({ windowMs: RATE_LIMITS.auth.windowMs, max: RATE_LIMITS.auth.max }),
);

// silence eslint no-unused-vars
void config;
