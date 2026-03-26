/**
 * Netlify Serverless Function — wraps Express API.
 * 
 * All /api/* requests route here via netlify.toml redirects.
 */
import type { Handler, HandlerContext, HandlerEvent } from '@netlify/functions';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Server modules — import from compiled server/dist/src/ directory
let app: express.Application | null = null;

async function createApp() {
  if (app) return app;

  // Dynamic imports from compiled server output
  const { config } = await import('../../server/dist/src/config.js');
  const { generalLimiter } = await import('../../server/dist/src/middleware/rate-limit.js');
  const { globalErrorHandler } = await import('../../server/dist/src/middleware/error-handler.js');
  const authRoutes = (await import('../../server/dist/src/routes/auth.js')).default;
  const userRoutes = (await import('../../server/dist/src/routes/users.js')).default;
  const readingRoutes = (await import('../../server/dist/src/routes/readings.js')).default;
  const paymentRoutes = (await import('../../server/dist/src/routes/payments.js')).default;
  const forumRoutes = (await import('../../server/dist/src/routes/forum.js')).default;
  const adminRoutes = (await import('../../server/dist/src/routes/admin.js')).default;

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
    res.json({ ok: true, timestamp: new Date().toISOString(), runtime: 'netlify-serverless' });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api', userRoutes);
  app.use('/api/readings', readingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/admin', adminRoutes);

  // 404
  app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

  // Error handler
  app.use(globalErrorHandler);

  return app;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const expressApp = await createApp();
  
  // Convert Netlify event to Express-like request
  const path = event.rawPath || event.path || '/';
  const method = event.httpMethod || 'GET';
  const headers = event.headers as Record<string, string>;
  const body = event.body || '';
  const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
  
  // Create mock request/response objects
  const req = {
    method,
    path,
    url: path + queryString,
    headers,
    body: body ? JSON.parse(body) : {},
    query: event.queryStringParameters || {},
    params: {},
  };
  
  return new Promise((resolve) => {
    const res = {
      status: (code: number) => {
        return {
          json: (data: any) => {
            resolve({
              statusCode: code,
              body: JSON.stringify(data),
              headers: {
                'Content-Type': 'application/json',
              },
            });
          },
          send: (data: any) => {
            resolve({
              statusCode: code,
              body: typeof data === 'string' ? data : JSON.stringify(data),
              headers: {
                'Content-Type': 'application/json',
              },
            });
          },
        };
      },
      json: (data: any) => {
        resolve({
          statusCode: 200,
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
      setHeader: () => {},
    };
    
    // Route to Express app
    expressApp(req as any, res as any, () => {});
  });
};