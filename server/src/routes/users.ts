import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { users } from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = Router();

// ─── GET /api/user/balance — Authenticated ──────────────────────────────────

router.get("/balance", ...requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = await db
      .select({ accountBalance: users.accountBalance })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!rows[0]) return res.status(404).json({ error: "User not found" });

    return res.json({ balance: rows[0].accountBalance });
  } catch (err) {
    logger.error({ err }, "Error fetching user balance");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
