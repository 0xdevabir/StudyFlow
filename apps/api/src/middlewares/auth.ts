import type { Request, RequestHandler } from 'express';
import { auth } from '@studyflow/auth';
import { UnauthorizedError } from '../lib/errors.js';
import type { SessionUser } from '@studyflow/auth/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
      session?: { id: string; userId: string };
    }
  }
}

/**
 * Verifies the session using Better Auth and attaches `req.user`.
 * `req.originalUrl` is preserved through the call so downstream middleware
 * can still see it.
 */
export const requireAuth: RequestHandler = async (req: Request, _res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) throw new UnauthorizedError();
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
      image: session.user.image ?? null,
      timezone: (session.user as { timezone?: string }).timezone,
      locale: (session.user as { locale?: string }).locale,
    };
    req.session = {
      id: session.session.id,
      userId: session.session.userId,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Optional auth — proceeds even without a session, populates if present. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
        timezone: (session.user as { timezone?: string }).timezone,
        locale: (session.user as { locale?: string }).locale,
      };
      req.session = {
        id: session.session.id,
        userId: session.session.userId,
      };
    }
    next();
  } catch (err) {
    next(err);
  }
};