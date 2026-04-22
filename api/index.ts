/**
 * Vercel Serverless Function — wraps the Express API.
 *
 * All /api/* requests route here. Static imports of the compiled server
 * keep the cold start simple and let Vercel's bundler trace the files.
 *
 * Note: WebSocket features (real-time billing, live status) require a
 * persistent server. Those are handled by the standalone server on Fly.io;
 * this function serves the REST API only. Client falls back to polling for
 * live reader status when WS is unavailable.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Static imports from compiled server output. Requires `npm run build -w shared`
// and `npm run build -w server` to have run first (handled by the root
// "build" script, which Vercel executes per vercel.json).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { config } = require('../server/dist/src/config.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generalLimiter, webhookLimiter } = require('../server/dist/src/middleware/rate-limit.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { globalErrorHandler } = require('../server/dist/src/middleware/error-handler.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const authRoutes = require('../server/dist/src/routes/auth.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const userRoutes = require('../server/dist/src/routes/users.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const readingRoutes = require('../server/dist/src/routes/readings.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const paymentRoutes = require('../server/dist/src/routes/payments.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const forumRoutes = require('../server/dist/src/routes/forum.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const adminRoutes = require('../server/dist/src/routes/admin.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const transactionRoutes = require('../server/dist/src/routes/transactions.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webhookRoutes = require('../server/dist/src/routes/webhooks.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const applicationRoutes = require('../server/dist/src/routes/applications.js').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const newsletterRoutes = require('../server/dist/src/routes/newsletter.js').default;

let app: express.Application | null = null;

function createApp() {
  if (app) return app;

  app = express();

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
    }),
  );

  app.use(generalLimiter);

  // Stripe webhook paths must use the raw body — mount rate limiter before JSON.
  app.use('/api/payments/webhook', webhookLimiter);
  app.use('/api/webhooks/stripe', webhookLimiter);

  // JSON parsing for everything except Stripe webhook (signature needs raw body)
  app.use((req, res, next) => {
    if (req.path === '/api/payments/webhook' || req.path === '/api/webhooks/stripe') {
      return next();
    }
    express.json({ limit: '2mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: false }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      runtime: 'vercel-serverless',
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

  return app;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const expressApp = createApp();
    return expressApp(req as unknown as express.Request, res as unknown as express.Response);
  } catch (err) {
    // Surface boot errors as 500 JSON instead of a generic crash so the client
    // can show a useful error.
    console.error('[api] createApp failed:', err);
    res.status(500).json({
      error: 'API boot failure',
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }
}
