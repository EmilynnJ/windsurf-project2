import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { requireJwt, requireAuth } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const syncSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1).max(255).optional(),
});

// ─── POST /api/auth/sync ────────────────────────────────────────────────────
// Sync Auth0 user to our DB on first login. Uses requireJwt (not requireAuth)
// because the user may not exist in our DB yet.

router.post("/sync", ...requireJwt, async (req: Request, res: Response) => {
  try {
    const auth0Id = req.auth?.payload?.sub;
    if (!auth0Id) return res.status(401).json({ error: "Missing auth0 subject" });

    const body = syncSchema.parse(req.body);
    const db = getDb();

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.auth0Id, auth0Id))
      .limit(1);

    if (existing[0]) {
      // User already synced — optionally update email
      if (existing[0].email !== body.email) {
        await db.update(users).set({ email: body.email }).where(eq(users.auth0Id, auth0Id));
      }
      return res.json({ user: existing[0], created: false });
    }

    // Create new user
    const inserted = await db
      .insert(users)
      .values({
        auth0Id,
        email: body.email,
        username: body.username || null,
        fullName: body.fullName || null,
        role: "client", // Default role — readers created by admin only
      })
      .returning();

    logger.info({ auth0Id, email: body.email }, "New user synced from Auth0");
    return res.status(201).json({ user: inserted[0], created: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Auth sync error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────

router.get("/me", ...requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userRows = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);

    if (!userRows[0]) return res.status(404).json({ error: "User not found" });

    // Strip sensitive fields
    const { auth0Id: _a, stripeCustomerId: _s, ...safeUser } = userRows[0];
    return res.json({ user: safeUser });
  } catch (err) {
    logger.error({ err }, "Error fetching user profile");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
