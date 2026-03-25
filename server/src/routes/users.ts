import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/db";
import { users, readings } from "../db/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/readers", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db.select({
      id: users.id, username: users.username, fullName: users.fullName,
      bio: users.bio, specialties: users.specialties, profileImage: users.profileImage,
      pricingChat: users.pricingChat, pricingVoice: users.pricingVoice, pricingVideo: users.pricingVideo,
      isOnline: users.isOnline, totalReadings: users.totalReadings,
    }).from(users).where(eq(users.role, "reader")).orderBy(desc(users.isOnline));
    res.json(result);
  } catch (err) { next(err); }
});

router.get("/readers/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const readerId = parseInt(req.params.id!, 10);
    if (isNaN(readerId)) { res.status(400).json({ error: "Invalid reader ID" }); return; }
    const [reader] = await db.select({
      id: users.id, username: users.username, fullName: users.fullName,
      bio: users.bio, specialties: users.specialties, profileImage: users.profileImage,
      pricingChat: users.pricingChat, pricingVoice: users.pricingVoice, pricingVideo: users.pricingVideo,
      isOnline: users.isOnline, totalReadings: users.totalReadings, createdAt: users.createdAt,
    }).from(users).where(and(eq(users.id, readerId), eq(users.role, "reader")));
    if (!reader) { res.status(404).json({ error: "Reader not found" }); return; }
    const readerReviews = await db.select({
      id: readings.id, rating: readings.rating, review: readings.review,
      completedAt: readings.completedAt, clientName: users.fullName, clientUsername: users.username,
    }).from(readings).innerJoin(users, eq(readings.clientId, users.id))
      .where(and(eq(readings.readerId, readerId), eq(readings.status, "completed")))
      .orderBy(desc(readings.completedAt)).limit(20);
    const rated = readerReviews.filter((r) => r.rating != null);
    const avgRating = rated.length > 0 ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : 0;
    res.json({ ...reader, avgRating: Math.round(avgRating * 10) / 10, reviewCount: rated.length, reviews: rated });
  } catch (err) { next(err); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { auth0Id, stripeAccountId, ...safe } = req.user;
    res.json(safe);
  } catch (err) { next(err); }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const allowed = ["fullName", "username", "bio", "profileImage"];
    const updates: Record<string, any> = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (!Object.keys(updates).length) { res.status(400).json({ error: "No valid fields" }); return; }
    updates.updatedAt = new Date();
    const [updated] = await db.update(users).set(updates).where(eq(users.id, req.user!.id)).returning();
    const { auth0Id, stripeAccountId, ...safe } = updated!;
    res.json(safe);
  } catch (err) { next(err); }
});

router.patch("/me/online", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") { res.status(403).json({ error: "Only readers" }); return; }
    const isOnline = req.body.isOnline === true;
    const [u] = await db.update(users).set({ isOnline, updatedAt: new Date() }).where(eq(users.id, req.user!.id)).returning({ isOnline: users.isOnline });
    res.json({ isOnline: u!.isOnline });
  } catch (err) { next(err); }
});

router.patch("/me/pricing", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") { res.status(403).json({ error: "Only readers" }); return; }
    const updates: Record<string, any> = {};
    const maxPricingCents = 100_000;
    if (typeof req.body.pricingChat === "number" && Number.isSafeInteger(req.body.pricingChat) && req.body.pricingChat >= 0 && req.body.pricingChat <= maxPricingCents)
      updates.pricingChat = req.body.pricingChat;
    if (typeof req.body.pricingVoice === "number" && Number.isSafeInteger(req.body.pricingVoice) && req.body.pricingVoice >= 0 && req.body.pricingVoice <= maxPricingCents)
      updates.pricingVoice = req.body.pricingVoice;
    if (typeof req.body.pricingVideo === "number" && Number.isSafeInteger(req.body.pricingVideo) && req.body.pricingVideo >= 0 && req.body.pricingVideo <= maxPricingCents)
      updates.pricingVideo = req.body.pricingVideo;
    if (!Object.keys(updates).length) { res.status(400).json({ error: "No pricing fields" }); return; }
    updates.updatedAt = new Date();
    const [u] = await db.update(users).set(updates).where(eq(users.id, req.user!.id)).returning();
    res.json({ pricingChat: u!.pricingChat, pricingVoice: u!.pricingVoice, pricingVideo: u!.pricingVideo });
  } catch (err) { next(err); }
});

export default router;
