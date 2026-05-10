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
// @ts-ignore
import express from 'express';
// @ts-ignore
import helmet from 'helmet';
// @ts-ignore
import cors from 'cors';

// Static imports from compiled server output. Requires `npm run build -w shared`
// and `npm run build -w server` to have run first (handled by the root
// "build" script, which Vercel executes per vercel.json).
// @ts-ignore
import { config } from '../server/dist/src/config.js';
// @ts-ignore
import { generalLimiter, webhookLimiter } from '../server/dist/src/middleware/rate-limit.js';
// @ts-ignore
import { globalErrorHandler } from '../server/dist/src/middleware/error-handler.js';
// @ts-ignore
import authRoutes from '../server/dist/src/routes/auth.js';
// @ts-ignore
import userRoutes from '../server/dist/src/routes/users.js';
// @ts-ignore
import readingRoutes from '../server/dist/src/routes/readings.js';
// @ts-ignore
import paymentRoutes from '../server/dist/src/routes/payments.js';
// @ts-ignore
import forumRoutes from '../server/dist/src/routes/forum.js';
// @ts-ignore
import adminRoutes from '../server/dist/src/routes/admin.js';
// @ts-ignore
import transactionRoutes from '../server/dist/src/routes/transactions.js';
// @ts-ignore
import webhookRoutes from '../server/dist/src/routes/webhooks.js';
// @ts-ignore
import applicationRoutes from '../server/dist/src/routes/applications.js';
// @ts-ignore
import newsletterRoutes from '../server/dist/src/routes/newsletter.js';

let app: express.Application | null = null;

function createApp() {
  if (app) return app;

  app = express();

  app.use(helmet());

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
    express.json({ limit: '2mb' })(req, res, (err) => {
      if (err) return next(err);
      express.urlencoded({ extended: false })(req, res, next);
    });
  });

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
    console.error('[api] createApp failed:', err instanceof Error ? err.stack : err);
    // Surface boot errors as 500 JSON instead of a generic crash so the client
    // can show a useful error.
    res.status(500).json({
      error: 'API boot failure',
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }
}
