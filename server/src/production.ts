/**
 * Production server for Fly.io deployment.
 *
 * Serves the REST API, the static client bundle, AND owns the long-running
 * concerns that Vercel's serverless runtime can't host:
 *   - WebSocket service (real-time push for reading:request, reading:ended,
 *     insufficient_balance, partner_disconnected, etc.)
 *   - Billing service (per-minute charge tick + grace-period sweeper that
 *     reads `lastHeartbeat`)
 *
 * Without this entry, heartbeat updates land in the DB but no sweeper ever
 * checks them, and reader-inbox / session-end notifications never fire.
 */
import http from 'http';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';

// Import server config and routes
import { config } from './config';
import { logger } from './utils/logger';
import { generalLimiter } from './middleware/rate-limit';
import { globalErrorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import readingRoutes from './routes/readings';
import paymentRoutes from './routes/payments';
import forumRoutes from './routes/forum';
import adminRoutes from './routes/admin';
import applicationRoutes from './routes/applications';
import newsletterRoutes from './routes/newsletter';
import webhookRoutes from './routes/webhooks';
import { wsService } from './services/websocket-service';
import { billingService } from './services/billing-service';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: config.corsOrigin.split(',').map((s: string) => s.trim()),
  credentials: true,
}));
app.use(generalLimiter);

// JSON parsing — skip for Stripe webhook (needs raw body)
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook' || req.path === '/api/webhooks/stripe') {
    return next();
  }
  express.json({ limit: '2mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

// Health check — also reports whether the long-running services are up so
// `/api/health` can be used to verify a Fly deploy actually wired them.
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    runtime: 'fly.io',
    nodeEnv: config.nodeEnv,
    websocket: 'attached',
    billing: 'running',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reader-applications', applicationRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/webhooks', webhookRoutes);

// Serve static files from client/dist
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// SPA fallback — send all non-API requests to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// 404 for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(globalErrorHandler);

// Wrap Express in an HTTP server so we can attach the WebSocket upgrade
// handler. `app.listen` would create one anyway but we need the reference.
const server = http.createServer(app);

// Attach the WebSocket server BEFORE listen so the upgrade handler is in
// place when the first connection arrives.
wsService.attach(server);

// Start the per-minute billing tick + grace-period sweeper. This is the
// process that reads `lastHeartbeat` and ends sessions when a participant
// has gone silent past the 120-second grace window.
billingService.start();

const PORT = Number(process.env.PORT) || 8080;
server.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      env: config.nodeEnv,
      health: `http://localhost:${PORT}/api/health`,
    },
    'SoulSeer server listening (api + ws + billing)',
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  billingService.shutdown();
  wsService.shutdown();
  server.close(() => process.exit(0));
  // Hard exit safety net
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
