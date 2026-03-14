// ============================================================
// Payment Routes — Stripe top-up, balance, webhook, payouts
//
// Business rules:
//   - Min top-up: $5.00 (500 cents)
//   - Balance in cents (integer), never float
//   - Stripe webhook MUST verify signature
//   - All balance ops use DB transactions
// ============================================================

import { Router, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";

import { getDb } from "../db/db";
import { users, transactions } from "../db/schema";
import { checkJwt } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/error-handler";
import { logger } from "../utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

const MIN_TOPUP_CENTS = 500; // $5.00

const router = Router();

// ── GET /api/payments/balance — Get current user balance ────────────────
router.get("/balance", checkJwt, async (req, res, next) => {
  try {
    const db = getDb();
    const [user] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, req.user!.id));

    res.json({ balance: user?.balance ?? 0 });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/create-payment-intent — Create Stripe payment intent
const paymentIntentSchema = z.object({
  amount: z.number().int().min(MIN_TOPUP_CENTS, `Minimum top-up is $${(MIN_TOPUP_CENTS / 100).toFixed(2)}`),
});

router.post(
  "/create-payment-intent",
  checkJwt,
  validate(paymentIntentSchema),
  async (req, res, next) => {
    try {
      const { amount } = req.body;
      const userId = req.user!.id;

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        metadata: {
          userId: userId.toString(),
          type: "balance_topup",
        },
      });

      logger.info({ userId, amount }, "Payment intent created");
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/payments/webhook — Stripe webhook handler ─────────────────
// NOTE: This route uses raw body (express.raw) configured in index.ts
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    logger.error("Missing Stripe signature or webhook secret");
    res.status(400).json({ error: "Missing signature" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    logger.error({ err: err.message }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const userId = parseInt(paymentIntent.metadata.userId!, 10);
    const amount = paymentIntent.amount;

    if (isNaN(userId) || userId <= 0) {
      logger.error({ paymentIntent: paymentIntent.id }, "Invalid userId in payment metadata");
      res.json({ received: true });
      return;
    }

    try {
      const db = getDb();
      await db.transaction(async (tx) => {
        // Credit user balance
        const [updated] = await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning({ balance: users.balance });

        if (!updated) {
          logger.error({ userId }, "User not found for balance credit");
          return;
        }

        // Log transaction
        await tx.insert(transactions).values({
          userId,
          type: "topup",
          amount,
          balanceAfter: updated.balance,
          note: "Stripe balance top-up",
          stripePaymentIntentId: paymentIntent.id,
        });
      });

      logger.info({ userId, amount, paymentIntent: paymentIntent.id }, "Balance credited via webhook");
    } catch (err) {
      logger.error({ err, userId, paymentIntent: paymentIntent.id }, "Failed to credit balance");
    }
  }

  res.json({ received: true });
});

// ── GET /api/payments/transactions — User transaction history ───────────
router.get("/transactions", checkJwt, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;

    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.createdAt} DESC`)
      .limit(100);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/payout — Admin triggers reader payout ────────────
const payoutSchema = z.object({
  readerId: z.number().int().positive(),
});

const PAYOUT_MIN_CENTS = 1500; // $15.00

router.post(
  "/payout",
  checkJwt,
  requireRole("admin"),
  validate(payoutSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const { readerId } = req.body;

      const [reader] = await db
        .select()
        .from(users)
        .where(eq(users.id, readerId));
      if (!reader) throw new AppError(404, "Reader not found");
      if (reader.role !== "reader") throw new AppError(400, "User is not a reader");
      if (reader.balance < PAYOUT_MIN_CENTS) {
        throw new AppError(400, `Reader balance ($${(reader.balance / 100).toFixed(2)}) is below minimum payout threshold ($${(PAYOUT_MIN_CENTS / 100).toFixed(2)})`);
      }
      if (!reader.stripeAccountId) {
        throw new AppError(400, "Reader has not completed Stripe Connect onboarding");
      }

      const payoutAmount = reader.balance;

      // Transfer to Stripe Connect account
      const transfer = await stripe.transfers.create({
        amount: payoutAmount,
        currency: "usd",
        destination: reader.stripeAccountId,
        metadata: {
          readerId: readerId.toString(),
          type: "reader_payout",
        },
      });

      // Zero out reader balance
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ balance: 0, updatedAt: new Date() })
          .where(eq(users.id, readerId));

        await tx.insert(transactions).values({
          userId: readerId,
          type: "reader_payout",
          amount: -payoutAmount,
          balanceAfter: 0,
          note: `Payout via Stripe Transfer ${transfer.id}`,
          stripePaymentIntentId: transfer.id,
        });
      });

      logger.info({ readerId, amount: payoutAmount, transfer: transfer.id }, "Reader payout processed");
      res.json({ success: true, amount: payoutAmount, transferId: transfer.id });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
