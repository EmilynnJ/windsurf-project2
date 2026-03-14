// ============================================================
// Reading Routes — On-demand reading flow, Agora tokens, chat
// ============================================================

import { Router } from "express";
import { eq, and, or, desc } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../db/db";
import { users, readings } from "../db/schema";
import { checkJwt } from "../middleware/auth";
import { requireRole, requireParticipant } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/error-handler";
import { billingService } from "../services/billing-service";
import { AgoraService } from "../services/agora-service";
import { wsService } from "../services/websocket-service";
import { logger } from "../utils/logger";

const MIN_BALANCE_CENTS = 500; // $5.00

const router = Router();

// All routes require auth
router.use(checkJwt);

// ── POST /api/readings/on-demand — Request an on-demand reading ──────────
const onDemandSchema = z.object({
  readerId: z.number().int().positive(),
  type: z.enum(["chat", "voice", "video"]),
});

router.post(
  "/on-demand",
  requireRole("client"),
  validate(onDemandSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const client = req.user!;
      const { readerId, type } = req.body;

      // Get reader
      const [reader] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, readerId), eq(users.role, "reader")));
      if (!reader) throw new AppError(404, "Reader not found");
      if (!reader.isOnline) throw new AppError(400, "Reader is not currently online");

      // Get rate
      const ratePerMinute =
        type === "chat" ? reader.pricingChat
        : type === "voice" ? reader.pricingVoice
        : reader.pricingVideo;
      if (ratePerMinute <= 0) throw new AppError(400, `This reader does not offer ${type} readings`);

      // Check balance
      if (client.balance < MIN_BALANCE_CENTS) {
        throw new AppError(400, `Minimum balance of $5.00 required. Current balance: $${(client.balance / 100).toFixed(2)}`);
      }

      // Create reading
      const [reading] = await db
        .insert(readings)
        .values({
          clientId: client.id,
          readerId,
          readingType: type,
          status: "pending",
          ratePerMinute,
          agoraChannel: "pending",
        })
        .returning();

      // Set channel name
      const agoraChannel = `reading_${reading!.id}`;
      const [updated] = await db
        .update(readings)
        .set({ agoraChannel })
        .where(eq(readings.id, reading!.id))
        .returning();

      // Notify reader
      wsService.send(readerId, "reading:request", {
        readingId: updated!.id,
        clientName: client.fullName ?? client.username,
        type,
        ratePerMinute,
      });

      res.status(201).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/readings/:id/accept — Reader accepts reading ──────────────
router.post("/:id/accept", requireRole("reader"), async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const reader = req.user!;

    const [reading] = await db
      .select()
      .from(readings)
      .where(
        and(
          eq(readings.id, readingId),
          eq(readings.readerId, reader.id),
          eq(readings.status, "pending"),
        ),
      );
    if (!reading) throw new AppError(404, "Reading not found or already accepted");

    const [updated] = await db
      .update(readings)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(readings.id, readingId))
      .returning();

    // Notify client
    wsService.send(reading.clientId, "reading:accepted", {
      readingId,
      readerName: reader.fullName ?? reader.username,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/readings/:id/agora-token — Get Agora token ────────────────
router.post("/:id/agora-token", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const userId = req.user!.id;

    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));
    if (!reading) throw new AppError(404, "Reading not found");
    if (reading.clientId !== userId && reading.readerId !== userId) {
      throw new AppError(403, "You are not a participant in this reading");
    }
    if (!reading.agoraChannel || reading.agoraChannel === "pending") {
      throw new AppError(400, "Reading channel not ready");
    }

    const tokens = AgoraService.generateTokens(
      reading.agoraChannel,
      userId,
      "publisher",
    );

    res.json({
      channel: reading.agoraChannel,
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/readings/:id/start — Both joined, start billing ───────────
router.post("/:id/start", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const userId = req.user!.id;

    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));
    if (!reading) throw new AppError(404, "Reading not found");
    if (reading.clientId !== userId && reading.readerId !== userId) {
      throw new AppError(403, "You are not a participant in this reading");
    }

    // Only start if active (accepted) and not already started
    if (reading.status !== "active") {
      throw new AppError(400, "Reading is not in the active state");
    }
    if (reading.startedAt) {
      // Already started — just return success (idempotent)
      res.json({ started: true, readingId });
      return;
    }

    const now = new Date();
    await db
      .update(readings)
      .set({ startedAt: now, lastHeartbeat: now, updatedAt: now })
      .where(eq(readings.id, readingId));

    // Start server-side billing
    billingService.startBilling(
      readingId,
      reading.clientId,
      reading.readerId,
      reading.ratePerMinute,
    );

    logger.info({ readingId }, "Reading session started");
    res.json({ started: true, readingId });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/readings/:id/end — End reading session ────────────────────
router.post("/:id/end", async (req, res, next) => {
  try {
    const readingId = parseInt(req.params.id!, 10);
    const db = getDb();
    const userId = req.user!.id;

    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));
    if (!reading) throw new AppError(404, "Reading not found");
    if (reading.clientId !== userId && reading.readerId !== userId) {
      throw new AppError(403, "You are not a participant in this reading");
    }

    // End billing (handles all finalization)
    await billingService.endBilling(readingId);

    // Fetch final state
    const [finalized] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));

    res.json(finalized);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/readings/:id/rate — Submit rating and review ──────────────
const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

router.post(
  "/:id/rate",
  requireRole("client"),
  validate(rateSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const readingId = parseInt(req.params.id!, 10);
      const client = req.user!;

      const [reading] = await db
        .select()
        .from(readings)
        .where(
          and(
            eq(readings.id, readingId),
            eq(readings.clientId, client.id),
            eq(readings.status, "completed"),
          ),
        );
      if (!reading) throw new AppError(404, "Completed reading not found");
      if (reading.rating) throw new AppError(400, "Already rated");

      const [updated] = await db
        .update(readings)
        .set({
          rating: req.body.rating,
          review: req.body.review ?? null,
          updatedAt: new Date(),
        })
        .where(eq(readings.id, readingId))
        .returning();

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/readings/client — Client's reading history ─────────────────
router.get("/client", requireRole("client"), async (req, res, next) => {
  try {
    const db = getDb();
    const clientId = req.user!.id;

    const result = await db
      .select({
        id: readings.id,
        readingType: readings.readingType,
        status: readings.status,
        ratePerMinute: readings.ratePerMinute,
        startedAt: readings.startedAt,
        completedAt: readings.completedAt,
        durationSeconds: readings.durationSeconds,
        totalCharged: readings.totalCharged,
        rating: readings.rating,
        review: readings.review,
        createdAt: readings.createdAt,
        readerName: users.fullName,
        readerUsername: users.username,
        readerImage: users.profileImage,
      })
      .from(readings)
      .innerJoin(users, eq(readings.readerId, users.id))
      .where(eq(readings.clientId, clientId))
      .orderBy(desc(readings.createdAt));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/readings/reader — Reader's session history ─────────────────
router.get("/reader", requireRole("reader"), async (req, res, next) => {
  try {
    const db = getDb();
    const readerId = req.user!.id;

    const result = await db
      .select({
        id: readings.id,
        readingType: readings.readingType,
        status: readings.status,
        ratePerMinute: readings.ratePerMinute,
        startedAt: readings.startedAt,
        completedAt: readings.completedAt,
        durationSeconds: readings.durationSeconds,
        readerEarned: readings.readerEarned,
        rating: readings.rating,
        review: readings.review,
        createdAt: readings.createdAt,
        // Privacy: show client ID, not personal info
        clientId: readings.clientId,
      })
      .from(readings)
      .where(eq(readings.readerId, readerId))
      .orderBy(desc(readings.createdAt));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
