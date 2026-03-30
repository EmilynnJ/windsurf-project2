/**
 * Stripe Webhook Route — POST /api/webhooks/stripe
 * Per build guide section 12.4: POST /api/webhooks/stripe
 * Also available at /api/payments/webhook for backward compat.
 */
import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import express from "express";
import { getDb } from "../db/db";
import { users, transactions } from "../db/schema";
import { config } from "../config";
import { logger } from "../utils/logger";

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2024-06-20" as any,
});

// POST /api/webhooks/stripe
router.post(
  "/stripe",
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
          logger.warn({ piId: pi.id }, "No userId in payment intent metadata");
          res.json({ received: true });
          return;
        }

        const db = getDb();

        // IDEMPOTENCY CHECK: Prevent duplicate credits from Stripe retries
        const [existing] = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(eq(transactions.stripePaymentIntentId, pi.id))
          .limit(1);

        if (existing) {
          logger.info({ piId: pi.id, userId }, "Duplicate webhook ignored (already processed)");
          res.json({ received: true });
          return;
        }

        await db.transaction(async (tx) => {
          // Double-check inside transaction for race conditions
          const [dup] = await tx
            .select({ id: transactions.id })
            .from(transactions)
            .where(eq(transactions.stripePaymentIntentId, pi.id))
            .limit(1);

          if (dup) return; // Already processed

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

        logger.info(
          { userId, amount: pi.amount },
          "Balance credited via webhook",
        );
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
