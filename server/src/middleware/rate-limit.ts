<<<<<<< HEAD
import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `${ip}:${req.path}`;
  const now = Date.now();

  // Clean up old entries
  for (const [storeKey, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(storeKey);
    }
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    rateLimitStore.set(key, entry);
  }

  // Check if rate limit exceeded
  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  // Increment count and continue
  entry.count++;
  next();
}

// Special rate limiter for messaging endpoints
export function messagingRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';
  const key = `messaging:${userId}:${ip}`;
  const now = Date.now();

  // Clean up old entries
  for (const [storeKey, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(storeKey);
    }
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    rateLimitStore.set(key, entry);
  }

  // Messaging endpoints have stricter limits: 5 messages per minute
  const MESSAGING_MAX_REQUESTS = 5;
  
  if (entry.count >= MESSAGING_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return res.status(429).json({
      error: 'Too many messages',
      message: `Message rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  // Increment count and continue
  entry.count++;
  next();
}
=======
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
