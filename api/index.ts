/**
 * Vercel Serverless Function — wraps Express API.
 * 
 * All /api/* requests route here. The Express app handles routing
 * internally (auth, users, readings, payments, forum, admin).
 * 
 * Note: WebSocket features (real-time billing, live status) require
 * a persistent server (not serverless). For production, consider
 * Vercel Functions with streaming or a separate WS service.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Server modules — import from compiled server/dist/src/ directory
// The build command compiles server before this function runs
let app: express.Application | null = null;

async function createApp() {
  if (app) return app;

  // Dynamic imports from compiled server output
  const { config } = await import('../server/dist/src/config.js');
  const { generalLimiter } = await import('../server/dist/src/middleware/rate-limit.js');
  const { globalErrorHandler } = await import('../server/dist/src/middleware/error-handler.js');
  const authRoutes = (await import('../server/dist/src/routes/auth.js')).default;
  const userRoutes = (await import('../server/dist/src/routes/users.js')).default;
  const readingRoutes = (await import('../server/dist/src/routes/readings.js')).default;
  const paymentRoutes = (await import('../server/dist/src/routes/payments.js')).default;
  const forumRoutes = (await import('../server/dist/src/routes/forum.js')).default;
  const adminRoutes = (await import('../server/dist/src/routes/admin.js')).default;
  const transactionRoutes = (await import('../server/dist/src/routes/transactions.js')).default;
  const webhookRoutes = (await import('../server/dist/src/routes/webhooks.js')).default;
  const applicationRoutes = (await import('../server/dist/src/routes/applications.js')).default;

  app = express();

  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin.split(',').map((s: string) => s.trim()),
    credentials: true,
  }));
  app.use(generalLimiter);

  // JSON parsing — skip for Stripe webhook (needs raw body)
  app.use((req, res, next) => {
    if (req.path === '/api/payments/webhook') return next();
    express.json({ limit: '2mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: false }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), runtime: 'vercel-serverless' });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api', userRoutes);
  app.use('/api/readings', readingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', transactionRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/reader-applications', applicationRoutes);

  // 404
  app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

  // Error handler
  app.use(globalErrorHandler);

  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await createApp();
  return expressApp(req as any, res as any);
}