import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";
import express from "express";
import { getDb } from "../db/db";
import { users, transactions } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { config } from "../config";
import { logger } from "../utils/logger";
import { strictLimiter } from "../middleware/rate-limit";

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2024-06-20" as any,
});

const MIN_TOPUP = 500;

// ─── POST /api/webhooks/stripe — Webhook (no auth, raw body) ────────────────
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      if (!sig) {
        res.status(400).json({ error: "Missing signature" });
        return;
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          config.stripe.webhookSecret,
        );
      } catch {
        res.status(400).json({ error: "Invalid signature" });
        return;
      }

      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as Stripe.PaymentIntent;
        const userId = parseInt(pi.metadata.userId ?? "0", 10);

        if (!userId) {
          logger.warn({ piId: pi.id }, "No userId in metadata");
          res.json({ received: true });
          return;
        }

        const db = getDb();
        await db.transaction(async (tx) => {
          // Get balance before update
          const [before] = await tx
            .select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, userId));
          const balanceBefore = before?.balance ?? 0;

          const [u] = await tx
            .update(users)
            .set({
              balance: sql`${users.balance} + ${pi.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({ balance: users.balance });

          await tx.insert(transactions).values({
            userId,
            type: "topup",
            amount: pi.amount,
            balanceBefore,
            balanceAfter: u!.balance,
            stripePaymentIntentId: pi.id,
            note: `Top-up $${(pi.amount / 100).toFixed(2)}`,
          });
        });

        logger.info({ userId, amount: pi.amount }, "Balance credited via webhook");
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/payments/balance — Current user balance ───────────────────────
router.get("/balance", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const [u] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, req.user!.id));
    res.json({ balance: u?.balance ?? 0 });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/payments/create-intent — Create Stripe PaymentIntent ─────────
const topupSchema = z.object({
  amount: z
    .number()
    .int("Amount must be whole cents")
    .min(MIN_TOPUP, "Minimum $5.00")
    .max(1_000_000, "Maximum $10,000"),
});

router.post(
  "/create-intent",
  requireAuth,
  strictLimiter,
  validateBody(topupSchema),
  async (req, res, next) => {
    try {
      const pi = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: "usd",
        metadata: { userId: String(req.user!.id), type: "balance_topup" },
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/payments/transactions — User's transaction history ────────────
router.get("/transactions", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const list = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, req.user!.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err) {
    next(err);
  }
});

export default router;
