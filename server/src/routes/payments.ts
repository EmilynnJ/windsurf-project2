import { Router, Request, Response, raw } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { transactions } from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../utils/logger";
import {
  createPaymentIntent,
  handlePaymentSucceeded,
  verifyWebhookSignature,
} from "../services/stripe-service";

// ─── Main payments router (mounted at /api/payments) ────────────────────────

const router = Router();

const createIntentSchema = z.object({
  amount: z.number().int().min(500, "Minimum top-up is $5.00"),
});

// POST /api/payments/create-intent — Authenticated
router.post("/create-intent", ...requireAuth, async (req: Request, res: Response) => {
  try {
    const body = createIntentSchema.parse(req.body);
    const result = await createPaymentIntent(req.user!.id, body.amount);

    return res.json({
      clientSecret: result.clientSecret,
      amount: body.amount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Error creating payment intent");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/transactions — Authenticated
router.get("/transactions", ...requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const txList = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, req.user!.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ transactions: txList, limit, offset });
  } catch (err) {
    logger.error({ err }, "Error fetching transactions");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Webhook router (mounted at /api/webhooks/stripe with raw body) ─────────

const webhookRouter = Router();

webhookRouter.post(
  "/",
  raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });

      const event = verifyWebhookSignature(req.body, sig);

      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as any;
        const userId = Number(pi.metadata?.userId);
        if (userId && pi.amount) {
          await handlePaymentSucceeded(pi.id, userId, pi.amount);
        }
      }

      return res.json({ received: true });
    } catch (err) {
      logger.error({ err }, "Stripe webhook error");
      return res.status(400).json({ error: "Webhook verification failed" });
    }
  },
);

export { webhookRouter };
export default router;
