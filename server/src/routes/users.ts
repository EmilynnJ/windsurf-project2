// ============================================================
// User & Reader Routes — Public reader profiles, user profile
// ============================================================

import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";

import { getDb } from "../db/db";
import { users, readings } from "../db/schema";
import { checkJwt } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = Router();

// ── GET /api/users/readers — Public reader list (for browse page) ───────
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
      .where(eq(users.role, "reader"))
      .orderBy(desc(users.isOnline));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/users/readers/:id — Single reader public profile ───────────
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
      .where(and(eq(users.id, readerId), eq(users.role, "reader")));

    if (!reader) {
      res.status(404).json({ error: "Reader not found" });
      return;
    }

    // Get reviews for this reader
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
        and(
          eq(readings.readerId, readerId),
          eq(readings.status, "completed"),
        ),
      )
      .orderBy(desc(readings.completedAt))
      .limit(20);

    // Calculate average rating
    const ratedReviews = readerReviews.filter((r) => r.rating != null);
    const avgRating =
      ratedReviews.length > 0
        ? ratedReviews.reduce((sum, r) => sum + r.rating!, 0) / ratedReviews.length
        : 0;

    res.json({
      ...reader,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: ratedReviews.length,
      reviews: readerReviews.filter((r) => r.rating != null),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/users/me — Authenticated user profile ──────────────────────
router.get("/me", checkJwt, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    // Strip sensitive fields
    const { auth0Id, stripeAccountId, ...safeProfile } = req.user;
    res.json(safeProfile);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/users/me — Update current user profile ───────────────────
router.patch("/me", checkJwt, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    const allowedFields = ["fullName", "username", "bio", "profileImage"];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    const { auth0Id, stripeAccountId, ...safeProfile } = updated!;
    res.json(safeProfile);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/users/me/online — Toggle reader online status ────────────
router.patch("/me/online", checkJwt, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers can toggle online status" });
      return;
    }

    const isOnline = req.body.isOnline === true;
    const [updated] = await db
      .update(users)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ isOnline: users.isOnline });

    res.json({ isOnline: updated!.isOnline });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/users/me/pricing — Update reader pricing ────────────────
router.patch("/me/pricing", checkJwt, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers can update pricing" });
      return;
    }

    const updates: Record<string, any> = {};
    if (typeof req.body.pricingChat === "number") updates.pricingChat = Math.max(0, req.body.pricingChat);
    if (typeof req.body.pricingVoice === "number") updates.pricingVoice = Math.max(0, req.body.pricingVoice);
    if (typeof req.body.pricingVideo === "number") updates.pricingVideo = Math.max(0, req.body.pricingVideo);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No pricing fields provided" });
      return;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    res.json({
      pricingChat: updated!.pricingChat,
      pricingVoice: updated!.pricingVoice,
      pricingVideo: updated!.pricingVideo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
