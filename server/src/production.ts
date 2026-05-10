/**
 * Production server for Fly.io deployment
 * Serves both the API and static client files
 */
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';

// Import server config and routes
import { config } from './config';
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

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for SPA compatibility
}));
app.use(cors({
  origin: config.corsOrigin.split(',').map((s: string) => s.trim()),
  credentials: true,
}));
app.use(generalLimiter);

// JSON parsing — skip for Stripe webhook (needs raw body)
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook' || req.path === '/api/webhooks/stripe') return next();
  express.json({ limit: '2mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(), 
    runtime: 'fly.io',
    nodeEnv: config.nodeEnv 
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

// SPA fallback - send all non-API requests to index.html
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

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 SoulSeer server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;