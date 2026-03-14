import { Router } from "express";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/db";
import { users, readings, transactions } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { AgoraService } from "../services/agora-service";
import { wsService } from "../services/websocket-service";
import { logger } from "../utils/logger";

const router = Router();
router.use(requireAuth);

const MIN_BALANCE_CENTS = 500;
const GRACE_PERIOD_MS = 120_000;

const startSchema = z.object({ readerId: z.number().int().positive(), readingType: z.enum(["chat", "voice", "video"]) });

router.post("/start", validateBody(startSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const { readerId, readingType } = req.body;
    if (readerId === req.user!.id) { res.status(400).json({ error: "Cannot read for yourself" }); return; }
    const [reader] = await db.select().from(users).where(and(eq(users.id, readerId), eq(users.role, "reader")));
    if (!reader) { res.status(404).json({ error: "Reader not found" }); return; }
    if (!reader.isOnline) { res.status(409).json({ error: "Reader is offline" }); return; }
    const rateKey = readingType === "chat" ? "pricingChat" : readingType === "voice" ? "pricingVoice" : "pricingVideo";
    const ratePerMinute = reader[rateKey];
    if (!ratePerMinute) { res.status(400).json({ error: `Reader has no ${readingType} pricing` }); return; }
    if (req.user!.balance < MIN_BALANCE_CENTS) { res.status(402).json({ error: `Minimum balance $${(MIN_BALANCE_CENTS / 100).toFixed(2)} required` }); return; }
    const channelName = `reading_${Date.now()}_${readerId}`;
    const [reading] = await db.insert(readings).values({
      clientId: req.user!.id, readerId, readingType, ratePerMinute, agoraChannel: channelName, status: "pending",
    }).returning();
    wsService.send(readerId, "reading:request", { readingId: reading!.id, clientId: req.user!.id, readingType, clientName: req.user!.fullName });
    const clientTokens = AgoraService.generateTokens(channelName, req.user!.id);
    const readerTokens = AgoraService.generateTokens(channelName, readerId);
    res.status(201).json({ reading, clientTokens, readerTokens });
  } catch (err) { next(err); }
});

router.post("/:id/accept", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const [reading] = await db.select().from(readings).where(and(eq(readings.id, readingId), eq(readings.readerId, req.user!.id), eq(readings.status, "pending")));
    if (!reading) { res.status(404).json({ error: "Reading not found or not pending" }); return; }
    const now = new Date();
    const [updated] = await db.update(readings).set({ status: "active", startedAt: now, lastHeartbeat: now, updatedAt: now }).where(eq(readings.id, readingId)).returning();
    wsService.send(reading.clientId, "reading:accepted", { readingId });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post("/:id/heartbeat", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const [reading] = await db.select().from(readings).where(and(eq(readings.id, readingId), eq(readings.status, "active"),
      or(eq(readings.clientId, req.user!.id), eq(readings.readerId, req.user!.id))));
    if (!reading) { res.status(404).json({ error: "Active reading not found" }); return; }
    await db.update(readings).set({ lastHeartbeat: new Date() }).where(eq(readings.id, readingId));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/:id/end", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const [reading] = await db.select().from(readings).where(and(eq(readings.id, readingId),
      or(eq(readings.clientId, req.user!.id), eq(readings.readerId, req.user!.id))));
    if (!reading) { res.status(404).json({ error: "Reading not found" }); return; }
    if (reading.status !== "active" && reading.status !== "paused") { res.status(409).json({ error: "Reading is not active" }); return; }
    const now = new Date();
    const durationSeconds = reading.startedAt ? Math.floor((now.getTime() - reading.startedAt.getTime()) / 1000) : 0;
    const billedMinutes = Math.ceil(durationSeconds / 60);
    const totalCharged = billedMinutes * reading.ratePerMinute;
    const readerEarned = Math.floor(totalCharged * 0.70);
    const platformEarned = totalCharged - readerEarned;

    await db.transaction(async (tx) => {
      await tx.update(readings).set({ status: "completed", completedAt: now, durationSeconds, totalCharged, readerEarned, platformEarned, updatedAt: now }).where(eq(readings.id, readingId));
      // Charge client
      const [clientAfter] = await tx.update(users).set({ balance: sql`${users.balance} - ${totalCharged}`, updatedAt: now }).where(eq(users.id, reading.clientId)).returning({ balance: users.balance });
      await tx.insert(transactions).values({ userId: reading.clientId, readingId, type: "reading_charge", amount: -totalCharged, balanceAfter: clientAfter!.balance, note: `Reading #${readingId}: ${billedMinutes} min` });
      // Credit reader
      const [readerAfter] = await tx.update(users).set({ balance: sql`${users.balance} + ${readerEarned}`, totalReadings: sql`${users.totalReadings} + 1`, updatedAt: now }).where(eq(users.id, reading.readerId)).returning({ balance: users.balance });
      await tx.insert(transactions).values({ userId: reading.readerId, readingId, type: "reader_payout", amount: readerEarned, balanceAfter: readerAfter!.balance, note: `Earned from reading #${readingId}` });
    });

    wsService.broadcast([reading.clientId, reading.readerId], "reading:ended", { readingId, durationSeconds, totalCharged, readerEarned });
    res.json({ readingId, durationSeconds, totalCharged, readerEarned, platformEarned });
  } catch (err) { next(err); }
});

router.post("/:id/rate", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: "Rating must be 1-5" }); return; }
    const [reading] = await db.select().from(readings).where(and(eq(readings.id, readingId), eq(readings.clientId, req.user!.id), eq(readings.status, "completed")));
    if (!reading) { res.status(404).json({ error: "Completed reading not found" }); return; }
    const [updated] = await db.update(readings).set({ rating, review: review || null, updatedAt: new Date() }).where(eq(readings.id, readingId)).returning();
    res.json(updated);
  } catch (err) { next(err); }
});

router.get("/history", async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    const result = await db.select().from(readings)
      .where(or(eq(readings.clientId, userId), eq(readings.readerId, userId)))
      .orderBy(desc(readings.createdAt)).limit(50);
    res.json(result);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const [reading] = await db.select().from(readings).where(eq(readings.id, readingId));
    if (!reading) { res.status(404).json({ error: "Reading not found" }); return; }
    if (reading.clientId !== req.user!.id && reading.readerId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Not a participant" }); return;
    }
    res.json(reading);
  } catch (err) { next(err); }
});

export default router;
