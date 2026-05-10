<<<<<<< HEAD
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/db';
import { users } from '@soulseer/shared/schema';
import { authMiddleware } from '../middleware/auth';

// Extend the Express Request type to include auth property
interface AuthenticatedRequest extends Request {
  auth?: {
    sub?: string;
    [key: string]: any;
  };
}
=======
import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/db";
import { users } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { logger } from "../utils/logger";
import { config } from "../config";
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8

const router = Router();

const callbackSchema = z.object({
  auth0Id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().optional(),
  profileImage: z.string().url().optional(),
  // Optional hint forwarded from the SPA after reading the Auth0 ID-token
  // custom claim. The server NEVER trusts this blindly: client/admin are
  // accepted as the *initial* role on first sync, reader is ignored from
  // this endpoint (readers can only be created via the admin flow).
  auth0Role: z.enum(["admin", "reader", "client"]).optional(),
});

function resolveInitialRole(
  email: string,
  hint: "admin" | "reader" | "client" | undefined,
): "admin" | "reader" | "client" {
  if (config.adminEmails.includes(email.toLowerCase())) return "admin";
  if (hint === "admin") return "admin"; // safe — paired with a verified JWT
  // Readers are created only by the admin flow; ignore the claim here so a
  // self-registered user can't promote themselves.
  return "client";
}

// POST /api/auth/sync — Sync Auth0 user to internal DB on first login
router.post(
  "/sync",
  requireAuth,
  validateBody(callbackSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const body = req.body;
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.auth0Id, body.auth0Id));
      if (existing) {
        const updates: Partial<typeof users.$inferInsert> = {};
        if (body.fullName && body.fullName !== existing.fullName) {
          updates.fullName = body.fullName;
        }
        if (body.profileImage && body.profileImage !== existing.profileImage) {
          updates.profileImage = body.profileImage;
        }
        // Promote to admin if the email is in the admin allowlist but the
        // DB role hasn't caught up yet. Demotion is intentionally not
        // performed — readers/admins keep their roles unless an admin
        // explicitly changes them.
        if (
          config.adminEmails.includes(existing.email.toLowerCase()) &&
          existing.role !== "admin"
        ) {
          updates.role = "admin";
        }
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
      const role = resolveInitialRole(body.email, body.auth0Role);
      const [newUser] = await db
        .insert(users)
        .values({
          auth0Id: body.auth0Id,
          email: body.email,
          fullName: body.fullName ?? null,
          profileImage: body.profileImage ?? null,
          role,
          balance: 0,
        })
        .returning();
      logger.info(
        { userId: newUser!.id, email: body.email, role },
        "New user created",
      );
      res.status(201).json(newUser);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { auth0Id, stripeAccountId, ...safeUser } = req.user;
    res.json(safeUser);
  } catch (err) { next(err); }
});

export default router;
