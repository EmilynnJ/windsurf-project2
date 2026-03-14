import { Router } from 'express';
import { z } from 'zod';
import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users } from '@soulseer/shared/schema';
import { checkJwt } from '../middleware/auth';
import { resolveUser, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { strictLimiter, webhookLimiter } from '../middleware/rate-limit';
import { createPaymentIntent, handleWebhook, createPayout } from '../services/stripe-service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();

const createIntentSchema = z.object({
  amount: z.number().int().min(500, 'Minimum top-up is $5.00'),
});

// POST /api/payments/create-intent — create Stripe PaymentIntent
router.post(
  '/create-intent',
  strictLimiter, checkJwt, resolveUser,
  validate(createIntentSchema),
  async (req, res, next) => {
    try {
      const { amount } = req.body as z.infer<typeof createIntentSchema>;
      const result = await createPaymentIntent(req.user!.id, amount);
      res.json(result);
    } catch (err) { next(err); }
  },
);

// POST /api/payments/webhook — Stripe webhook (verify signature!)
router.post(
  '/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        throw new AppError(400, 'Missing Stripe signature');
      }
      await handleWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (err) { next(err); }
  },
);

// GET /api/payments/balance — get current balance (Auth)
router.get('/balance', checkJwt, resolveUser, async (req, res, next) => {
  try {
    const [user] = await db.select({ accountBalance: users.accountBalance })
      .from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) throw new AppError(404, 'User not found');
    res.json({ balance: user.accountBalance });
  } catch (err) { next(err); }
});

// POST /api/payments/payout — admin triggers reader payout (Admin)
router.post(
  '/payout',
  checkJwt, resolveUser, requireRole('admin'),
  async (req, res, next) => {
    try {
      const { readerId } = req.body as { readerId: number };
      if (!readerId) throw new AppError(400, 'readerId is required');
      const result = await createPayout(readerId);
      res.json(result);
    } catch (err) { next(err); }
  },
);

export default router;
