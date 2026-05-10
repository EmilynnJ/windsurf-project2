/**
 * Transaction Routes — GET /api/transactions
 * Per build guide section 12.4: top-level authenticated route for user transaction history.
 */
import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/db";
import { transactions } from "../db/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/transactions — User's transaction history (authenticated)
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
