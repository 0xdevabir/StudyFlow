import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { config } from './lib/env.js';
import { logger } from './lib/logger.js';
import { requestId } from './middlewares/request-id.js';
import { globalRateLimit } from './middlewares/rate-limit.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import apiRouter from './routes.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// 1. Request id + structured logs (must come before route handlers).
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({ reqId: (req as { id?: string }).id }),
    autoLogging: { ignore: (req) => req.url === '/api/health' },
  }),
);

// 2. Security headers + CORS + parsers.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// 3. Global rate limit (auth/upload routes override per-module).
app.use(globalRateLimit);

// 4. Routes.
app.use('/api', apiRouter);

// 5. 404 + error handlers (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(
    `StudyFlow API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`,
  );
});

export { app };