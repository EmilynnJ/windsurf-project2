import { Router } from "express";
import { eq, and, desc, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/db";
import { users, readings } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { auth0ManagementService } from "../services/auth0-management";
import { logger } from "../utils/logger";

const router = Router();

// ─── GET /api/readers — All reader profiles (public) ────────────────────────
router.get("/readers", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        totalReadings: users.totalReadings,
      })
      .from(users)
      .where(and(eq(users.role, "reader"), isNull(users.deletedAt)))
      .orderBy(desc(users.isOnline));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/readers/online — Online readers only (public) ─────────────────
router.get("/readers/online", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        totalReadings: users.totalReadings,
      })
      .from(users)
      .where(and(eq(users.role, "reader"), eq(users.isOnline, true), isNull(users.deletedAt)));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/readers/:id — Single reader profile (public) ──────────────────
router.get("/readers/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const readerId = parseInt(req.params.id!, 10);

    if (isNaN(readerId)) {
      res.status(400).json({ error: "Invalid reader ID" });
      return;
    }

    const [reader] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        totalReadings: users.totalReadings,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, readerId), eq(users.role, "reader"), isNull(users.deletedAt)));

    if (!reader) {
      res.status(404).json({ error: "Reader not found" });
      return;
    }

    // Get reviews
    const readerReviews = await db
      .select({
        id: readings.id,
        rating: readings.rating,
        review: readings.review,
        completedAt: readings.completedAt,
        clientName: users.fullName,
        clientUsername: users.username,
      })
      .from(readings)
      .innerJoin(users, eq(readings.clientId, users.id))
      .where(
        and(eq(readings.readerId, readerId), eq(readings.status, "completed")),
      )
      .orderBy(desc(readings.completedAt))
      .limit(20);

    const rated = readerReviews.filter((r) => r.rating != null);
    const avgRating =
      rated.length > 0
        ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length
        : 0;

    res.json({
      ...reader,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: rated.length,
      reviews: rated,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/user/balance — Current user balance (authenticated) ───────────
router.get("/user/balance", requireAuth, async (req, res, next) => {
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

// ─── GET /api/me — Current user profile ─────────────────────────────────────
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const { auth0Id, stripeAccountId, stripeCustomerId, ...safe } = req.user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/me — Update own profile ─────────────────────────────────────
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(2000).optional(),
  profileImage: z.string().url().max(512).optional(),
});

router.patch(
  "/me",
  requireAuth,
  validateBody(updateProfileSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const allowed = ["fullName", "username", "bio", "profileImage"];
      const updates: Record<string, any> = {};
      for (const f of allowed) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      }
      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No valid fields" });
        return;
      }
      updates.updatedAt = new Date();

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user!.id))
        .returning();

      const { auth0Id, stripeAccountId, stripeCustomerId, ...safe } = updated!;
      res.json(safe);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/readers/status — Toggle online/offline (reader only) ────────
router.patch("/readers/status", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers" });
      return;
    }
    const isOnline = req.body.isOnline === true;
    const [u] = await db
      .update(users)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({ isOnline: users.isOnline });

    // If the reader has just gone offline, notify any partners on active/pending
    // readings and mark accepted/in-progress sessions as paused so billing
    // stops. The client can then end the session cleanly.
    if (!isOnline) {
      const { billingService } = await import("../services/billing-service");
      await billingService.handleReaderOffline(req.user!.id);
    }

    res.json({ isOnline: u!.isOnline });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/readers/pricing — Update per-type rates (reader only) ───────
const pricingSchema = z.object({
  pricingChat: z.number().int().min(0).max(100_000).optional(),
  pricingVoice: z.number().int().min(0).max(100_000).optional(),
  pricingVideo: z.number().int().min(0).max(100_000).optional(),
});

router.patch(
  "/readers/pricing",
  requireAuth,
  validateBody(pricingSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      if (req.user!.role !== "reader") {
        res.status(403).json({ error: "Only readers" });
        return;
      }
      const updates: Record<string, any> = {};
      if (req.body.pricingChat !== undefined) updates.pricingChat = req.body.pricingChat;
      if (req.body.pricingVoice !== undefined) updates.pricingVoice = req.body.pricingVoice;
      if (req.body.pricingVideo !== undefined) updates.pricingVideo = req.body.pricingVideo;

      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No pricing fields" });
        return;
      }
      updates.updatedAt = new Date();

      const [u] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user!.id))
        .returning();

      res.json({
        pricingChat: u!.pricingChat,
        pricingVoice: u!.pricingVoice,
        pricingVideo: u!.pricingVideo,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/readers/profile — Update bio and specialties (reader only) ──
const readerProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
});

router.patch(
  "/readers/profile",
  requireAuth,
  validateBody(readerProfileSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      if (req.user!.role !== "reader") {
        res.status(403).json({ error: "Only readers" });
        return;
      }
      const updates: Record<string, any> = {};
      if (req.body.bio !== undefined) updates.bio = req.body.bio;
      if (req.body.specialties !== undefined) updates.specialties = req.body.specialties;

      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No valid fields" });
        return;
      }
      updates.updatedAt = new Date();

      const [u] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user!.id))
        .returning();

      const { auth0Id, stripeAccountId, stripeCustomerId, ...safe } = u!;
      res.json(safe);
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/me — Delete own account ────────────────────────────────────
// Soft-deletes the user by setting deletedAt, scrubbing PII, forcing offline,
// and clearing Stripe/Auth0 references. Historical readings/transactions are
// retained for compliance and accounting.
router.delete("/me", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;

    // Block deletion if the user has an active reading in progress.
    const active = await db
      .select({ id: readings.id })
      .from(readings)
      .where(
        and(
          or(eq(readings.clientId, userId), eq(readings.readerId, userId)),
          inArray(readings.status, ["pending", "accepted", "in_progress", "active", "paused"] as const),
        ),
      )
      .limit(1);

    if (active.length > 0) {
      res.status(409).json({
        error: "You have an active reading. End it before deleting your account.",
      });
      return;
    }

    // Admins cannot self-delete — prevents locking platform out of admin access.
    if (req.user!.role === "admin") {
      res.status(403).json({
        error: "Admins cannot delete their own account. Ask another admin.",
      });
      return;
    }

    // Try to delete the Auth0 user first (best effort). If it fails we still
    // want to scrub local data so the user is effectively logged out.
    const auth0Id = req.user!.auth0Id;
    let auth0Deleted = false;
    try {
      auth0Deleted = await auth0ManagementService.deleteUser(auth0Id);
    } catch (err) {
      logger.error({ err, userId }, "Auth0 deletion failed during account delete — continuing with local scrub");
    }

    const now = new Date();
    const scrubbedEmail = `deleted-${userId}-${now.getTime()}@deleted.soulseer.invalid`;
    const scrubbedAuth0Id = `deleted|${userId}|${now.getTime()}`;

    await db
      .update(users)
      .set({
        email: scrubbedEmail,
        auth0Id: scrubbedAuth0Id,
        username: null,
        fullName: "Deleted User",
        profileImage: null,
        bio: null,
        specialties: null,
        isOnline: false,
        stripeAccountId: null,
        stripeCustomerId: null,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    logger.info({ userId, auth0Deleted }, "Account deleted");
    res.json({ ok: true, auth0Deleted });
  } catch (err) {
    next(err);
  }
});

// ─── Backward compatible routes ─────────────────────────────────────────────
router.patch("/me/online", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers" });
      return;
    }
    const isOnline = req.body.isOnline === true;
    const [u] = await db
      .update(users)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({ isOnline: users.isOnline });

    if (!isOnline) {
      const { billingService } = await import("../services/billing-service");
      await billingService.handleReaderOffline(req.user!.id);
    }

    res.json({ isOnline: u!.isOnline });
  } catch (err) {
    next(err);
  }
});

router.patch("/me/pricing", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers" });
      return;
    }
    const updates: Record<string, any> = {};
    const maxPricingCents = 100_000;
    if (
      typeof req.body.pricingChat === "number" &&
      Number.isSafeInteger(req.body.pricingChat) &&
      req.body.pricingChat >= 0 &&
      req.body.pricingChat <= maxPricingCents
    )
      updates.pricingChat = req.body.pricingChat;
    if (
      typeof req.body.pricingVoice === "number" &&
      Number.isSafeInteger(req.body.pricingVoice) &&
      req.body.pricingVoice >= 0 &&
      req.body.pricingVoice <= maxPricingCents
    )
      updates.pricingVoice = req.body.pricingVoice;
    if (
      typeof req.body.pricingVideo === "number" &&
      Number.isSafeInteger(req.body.pricingVideo) &&
      req.body.pricingVideo >= 0 &&
      req.body.pricingVideo <= maxPricingCents
    )
      updates.pricingVideo = req.body.pricingVideo;

    if (!Object.keys(updates).length) {
      res.status(400).json({ error: "No pricing fields" });
      return;
    }
    updates.updatedAt = new Date();

    const [u] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.id))
      .returning();

    res.json({
      pricingChat: u!.pricingChat,
      pricingVoice: u!.pricingVoice,
      pricingVideo: u!.pricingVideo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
