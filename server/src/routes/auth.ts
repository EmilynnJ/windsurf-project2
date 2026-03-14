// ============================================================
// Auth Routes — Auth0 callback, user sync, profile retrieval
// ============================================================

import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../db/db";
import { users } from "../db/schema";
import { checkJwt } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { logger } from "../utils/logger";

const router = Router();

// ── POST /api/auth/callback — Sync Auth0 user to internal DB ────────────
const callbackSchema = z.object({
  auth0Id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().optional(),
  profileImage: z.string().url().optional(),
});

router.post("/callback", checkJwt, validate(callbackSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;

    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.auth0Id, body.auth0Id));

    if (existing) {
      // Update if name or profile image changed
      const updates: Partial<typeof users.$inferInsert> = {};
      if (body.fullName && body.fullName !== existing.fullName) updates.fullName = body.fullName;
      if (body.profileImage && body.profileImage !== existing.profileImage) updates.profileImage = body.profileImage;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        const [updated] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, existing.id))
          .returning();
        res.json(updated);
      } else {
        res.json(existing);
      }
      return;
    }

    // Create new user (defaults to client role)
    const [newUser] = await db
      .insert(users)
      .values({
        auth0Id: body.auth0Id,
        email: body.email,
        fullName: body.fullName ?? null,
        profileImage: body.profileImage ?? null,
        role: "client",
        balance: 0,
      })
      .returning();

    logger.info({ userId: newUser!.id, email: body.email }, "New user created");
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me — Get current user profile ─────────────────────────
router.get("/me", checkJwt, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    // Return user profile (req.user is populated by auth middleware)
    const { auth0Id, stripeAccountId, ...safeUser } = req.user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
});

export default router;
