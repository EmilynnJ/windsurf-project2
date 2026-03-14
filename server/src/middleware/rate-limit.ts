import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for all public endpoints.
 * 100 requests per 15-minute window per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Strict rate limiter for auth, payment, and reading-creation endpoints.
 * 20 requests per 15-minute window per IP.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

/**
 * Very strict limiter for webhook endpoints (Stripe, etc.).
 * 60 requests per minute per IP — high enough for Stripe retries,
 * low enough to block abuse.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many webhook requests.' },
});
