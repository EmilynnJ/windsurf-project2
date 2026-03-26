/**
 * Production server for Fly.io deployment
 * Serves both the API and static client files
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';

// Import server config and routes
import { config } from './config.js';
import { generalLimiter } from './middleware/rate-limit.js';
import { globalErrorHandler } from './middleware/error-handler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import readingRoutes from './routes/readings.js';
import paymentRoutes from './routes/payments.js';
import forumRoutes from './routes/forum.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  if (req.path === '/api/payments/webhook') return next();
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