import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../db/db";
import { newsletterSubscribers } from "../db/schema";
import { validateBody } from "../middleware/validate";
import { logger } from "../utils/logger";

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email().max(255).transform((e) => e.trim().toLowerCase()),
});

// ─── POST /api/newsletter/subscribe ─────────────────────────────────────────
router.post("/subscribe", validateBody(subscribeSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const email = req.body.email as string;

    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email));

    if (existing) {
      // Re-activate if previously unsubscribed.
      if (existing.unsubscribedAt) {
        await db
          .update(newsletterSubscribers)
          .set({ unsubscribedAt: null })
          .where(eq(newsletterSubscribers.id, existing.id));
      }
      res.status(200).json({ ok: true, subscribed: true, alreadySubscribed: !existing.unsubscribedAt });
      return;
    }

    await db.insert(newsletterSubscribers).values({ email });
    logger.info({ email }, "Newsletter signup");
    res.status(201).json({ ok: true, subscribed: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/newsletter/unsubscribe ───────────────────────────────────────
router.post("/unsubscribe", validateBody(subscribeSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const email = req.body.email as string;

    await db
      .update(newsletterSubscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.email, email));

    res.json({ ok: true, subscribed: false });
  } catch (err) {
    next(err);
  }
});

export default router;
