import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';

export const apiRouter = Router();

// Mount Better Auth first so it owns its prefix entirely.
apiRouter.use('/auth', authRouter);

apiRouter.use('/v1/users', userRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() } });
});

export default apiRouter;