/**
 * Mounts Better Auth on the Express app. Better Auth ships with a Node
 * handler we wire up at `/api/auth/*`. The web app's `/api/auth/[...all]`
 * route also goes through this same auth instance.
 */
import { Router } from 'express';
import { auth } from '@studyflow/auth';
import { authRateLimit } from '../../middlewares/rate-limit.js';

export const authRouter = Router();

/** Mount Better Auth with a stricter rate limit. */
authRouter.use(authRateLimit);
authRouter.all('/*splat', async (req, res, next) => {
  try {
    const protocol = req.header('x-forwarded-proto') ?? req.protocol;
    const url = `${protocol}://${req.get('host')}${req.originalUrl}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue;
      if (Array.isArray(v)) headers.set(k, v.join(', '));
      else headers.set(k, String(v));
    }
    const request = new Request(url, {
      method: req.method,
      headers,
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : JSON.stringify(req.body ?? {}),
    });
    const response = await auth.handler(request);
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const text = await response.text();
    res.send(text);
  } catch (err) {
    next(err);
  }
});
