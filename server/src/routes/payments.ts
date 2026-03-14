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

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, { apiVersion: "2024-06-20" as any });

const MIN_TOPUP = 500;

// ─── Webhook (no auth, raw body) ───────────────────────────────────────────
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    if (!sig) { res.status(400).json({ error: "Missing signature" }); return; }
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret); }
    catch { res.status(400).json({ error: "Invalid signature" }); return; }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = parseInt(pi.metadata.userId ?? "0", 10);
      if (!userId) { logger.warn({ piId: pi.id }, "No userId in metadata"); res.json({ received: true }); return; }
      const db = getDb();
      await db.transaction(async (tx) => {
        const [u] = await tx.update(users).set({ balance: sql`${users.balance} + ${pi.amount}`, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ balance: users.balance });
        await tx.insert(transactions).values({ userId, type: "topup", amount: pi.amount, balanceAfter: u!.balance, stripePaymentIntentId: pi.id, note: `Top-up $${(pi.amount / 100).toFixed(2)}` });
      });
      logger.info({ userId, amount: pi.amount }, "Balance credited");
    }
    res.json({ received: true });
  } catch (err) { next(err); }
});

// ─── Authenticated routes ──────────────────────────────────────────────────
router.get("/balance", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const [u] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, req.user!.id));
    res.json({ balance: u?.balance ?? 0 });
  } catch (err) { next(err); }
});

const topupSchema = z.object({ amount: z.number().int().min(MIN_TOPUP) });
router.post("/create-payment-intent", requireAuth, validateBody(topupSchema), async (req, res, next) => {
  try {
    const pi = await stripe.paymentIntents.create({
      amount: req.body.amount, currency: "usd",
      metadata: { userId: String(req.user!.id), type: "balance_topup" },
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err) { next(err); }
});

router.get("/transactions", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const list = await db.select().from(transactions).where(eq(transactions.userId, req.user!.id)).orderBy(desc(transactions.createdAt)).limit(50);
    res.json(list);
  } catch (err) { next(err); }
});

const payoutSchema = z.object({});
router.post("/payout", requireAuth, validateBody(payoutSchema), async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") { res.status(403).json({ error: "Readers only" }); return; }
    const [reader] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!reader?.stripeAccountId) { res.status(400).json({ error: "No Stripe Connect account" }); return; }
    if (reader.balance < 1500) { res.status(400).json({ error: "Min payout $15.00" }); return; }
    const amount = reader.balance;
    const result = await db.update(users).set({ balance: 0, updatedAt: new Date() }).where(sql`${users.id} = ${reader.id} AND ${users.balance} = ${amount}`).returning({ id: users.id });
    if (!result.length) { res.status(409).json({ error: "Balance changed, retry" }); return; }
    const transfer = await stripe.transfers.create({ amount, currency: "usd", destination: reader.stripeAccountId, metadata: { readerId: String(reader.id) } });
    await db.insert(transactions).values({ userId: reader.id, type: "reader_payout", amount: -amount, balanceAfter: 0, stripePaymentIntentId: transfer.id, note: `Payout $${(amount / 100).toFixed(2)}` });
    res.json({ transferId: transfer.id, amount });
  } catch (err) { next(err); }
});

export default router;
