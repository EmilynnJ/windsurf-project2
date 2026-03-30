/**
 * Netlify Serverless Function -- wraps the Express API via serverless-http.
 *
 * All /api/* requests are routed here by the netlify.toml redirects.
 * serverless-http handles the full event-to-Express translation, including
 * headers, query params, body parsing, and streaming responses.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler_instance: any = null;

async function getHandler() {
  if (handler_instance) return handler_instance;

  // Dynamic imports from compiled server output (only exist after `npm run build`)
  // @ts-expect-error -- resolved at runtime after server build
  const { config } = await import('../../server/dist/src/config.js');
  // @ts-expect-error -- resolved at runtime after server build
  const { generalLimiter } = await import('../../server/dist/src/middleware/rate-limit.js');
  // @ts-expect-error -- resolved at runtime after server build
  const { globalErrorHandler } = await import('../../server/dist/src/middleware/error-handler.js');
  // @ts-expect-error -- resolved at runtime after server build
  const authRoutes = (await import('../../server/dist/src/routes/auth.js')).default;
  // @ts-expect-error -- resolved at runtime after server build
  const userRoutes = (await import('../../server/dist/src/routes/users.js')).default;
  // @ts-expect-error -- resolved at runtime after server build
  const readingRoutes = (await import('../../server/dist/src/routes/readings.js')).default;
  // @ts-expect-error -- resolved at runtime after server build
  const paymentRoutes = (await import('../../server/dist/src/routes/payments.js')).default;
  // @ts-expect-error -- resolved at runtime after server build
  const forumRoutes = (await import('../../server/dist/src/routes/forum.js')).default;
  // @ts-expect-error -- resolved at runtime after server build
  const adminRoutes = (await import('../../server/dist/src/routes/admin.js')).default;
  // @ts-expect-error -- resolved at runtime after server build
  const webhookRoutes = (await import('../../server/dist/src/routes/webhooks.js')).default;
  // @ts-expect-error -- resolved at runtime after server build
  const transactionRoutes = (await import('../../server/dist/src/routes/transactions.js')).default;

  const app = express();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for SPA compatibility in serverless
    crossOriginEmbedderPolicy: false, // Needed for Agora
  }));

  // CORS
  app.use(cors({
    origin: config.corsOrigin.split(',').map((s: string) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }));

  // Rate limiting
  app.use(generalLimiter);

  // JSON parsing -- skip for Stripe webhook (needs raw body for signature verification)
  app.use((req, _res, next) => {
    if (req.path === '/api/payments/webhook' || req.path === '/api/webhooks/stripe') {
      return next();
    }
    express.json({ limit: '2mb' })(req, _res, next);
  });
  app.use(express.urlencoded({ extended: false }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      runtime: 'netlify-serverless',
    });
  });

  // ─── API routes (matching build guide section 12) ─────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api', userRoutes);
  app.use('/api/readings', readingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api', transactionRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/admin', adminRoutes);

  // 404 fallback for unmatched API routes
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  handler_instance = serverless(app);
  return handler_instance;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  const h = await getHandler();
  const result = await h(event, context);
  return result as HandlerResponse;
};
