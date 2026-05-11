/**
 * Netlify Serverless Function -- wraps the Express API via serverless-http.
 *
 * All /api/* requests are routed here by the netlify.toml redirects.
 * Uses static requires against the compiled server/dist so Netlify's esbuild
 * bundler can statically trace and include every dependency.
 *
 * Note: WebSocket features (real-time billing, live status) are not available
 * in a serverless environment. Those require a persistent server (e.g. Fly.io).
 * Polling-based fallbacks are used on the client for reader online status.
 */
import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import serverless from 'serverless-http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Static imports from compiled server output (requires `npm run build` to have
// run, which is part of Netlify's build command per netlify.toml).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { config } = require('../../server/dist/src/config.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generalLimiter, webhookLimiter } = require('../../server/dist/src/middleware/rate-limit.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { globalErrorHandler } = require('../../server/dist/src/middleware/error-handler.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const authRoutes = require('../../server/dist/src/routes/auth.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const userRoutes = require('../../server/dist/src/routes/users.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const readingRoutes = require('../../server/dist/src/routes/readings.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const paymentRoutes = require('../../server/dist/src/routes/payments.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const forumRoutes = require('../../server/dist/src/routes/forum.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const adminRoutes = require('../../server/dist/src/routes/admin.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const transactionRoutes = require('../../server/dist/src/routes/transactions.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webhookRoutes = require('../../server/dist/src/routes/webhooks.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const applicationRoutes = require('../../server/dist/src/routes/applications.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const newsletterRoutes = require('../../server/dist/src/routes/newsletter.js').default;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler_instance: any = null;

function createHandler() {
  if (handler_instance) return handler_instance;

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: config.corsOrigin.split(',').map((s: string) => s.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(generalLimiter);

  app.use('/api/payments/webhook', webhookLimiter);
  app.use('/api/webhooks/stripe', webhookLimiter);

  // JSON parsing -- skip for Stripe webhook (needs raw body for signature verification)
  app.use((req, _res, next) => {
    if (req.path === '/api/payments/webhook' || req.path === '/api/webhooks/stripe') {
      return next();
    }
    express.json({ limit: '2mb' })(req, _res, next);
  });
  app.use(express.urlencoded({ extended: false }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      runtime: 'netlify-serverless',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', userRoutes);
  app.use('/api/readings', readingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/newsletter', newsletterRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reader-applications', applicationRoutes);
  app.use('/api', transactionRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(globalErrorHandler);

  handler_instance = serverless(app);
  return handler_instance;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    const h = createHandler();
    const result = await h(event, context);
    return result as HandlerResponse;
  } catch (err) {
    console.error('[netlify/api] handler failure:', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'API boot failure',
        message: err instanceof Error ? err.message : String(err),
      }),
    };
  }
};
