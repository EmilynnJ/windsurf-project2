import { Router } from "express";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/db";
import { users, readings, transactions } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { requireParticipant } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { AgoraService } from "../services/agora-service";
import { wsService } from "../services/websocket-service";
import { billingService } from "../services/billing-service";
import { logger } from "../utils/logger";
import { strictLimiter } from "../middleware/rate-limit";

const router = Router();

const MIN_BALANCE_CENTS = 500;

// ─── POST /api/readings/on-demand — Client creates reading request ──────────
const onDemandSchema = z.object({
  readerId: z.number().int().positive(),
  readingType: z.enum(["chat", "voice", "video"]),
});

router.post(
  "/on-demand",
  requireAuth,
  strictLimiter,
  validateBody(onDemandSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const { readerId, readingType } = req.body;

      // Cannot read for yourself
      if (readerId === req.user!.id) {
        res.status(400).json({ error: "Cannot read for yourself" });
        return;
      }

      // Must be a client
      if (req.user!.role !== "client" && req.user!.role !== "admin") {
        res.status(403).json({ error: "Only clients can request readings" });
        return;
      }

      // Verify reader exists and is online
      const [reader] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, readerId), eq(users.role, "reader")));

      if (!reader) {
        res.status(404).json({ error: "Reader not found" });
        return;
      }
      if (!reader.isOnline) {
        res.status(409).json({ error: "Reader is offline" });
        return;
      }

      // Check pricing exists for this type
      const rateKey =
        readingType === "chat"
          ? "pricingChat"
          : readingType === "voice"
            ? "pricingVoice"
            : "pricingVideo";
      const ratePerMinute = reader[rateKey];

      if (!ratePerMinute || ratePerMinute <= 0) {
        res
          .status(400)
          .json({ error: `Reader has no ${readingType} pricing set` });
        return;
      }

      // Check minimum balance
      if (req.user!.balance < MIN_BALANCE_CENTS) {
        res.status(402).json({
          error: `Minimum balance $${(MIN_BALANCE_CENTS / 100).toFixed(2)} required`,
          code: "INSUFFICIENT_BALANCE",
        });
        return;
      }

      // Create unique Agora channel name
      const channelName = `reading_${Date.now()}_${readerId}`;

      // Create reading record
      const [reading] = await db
        .insert(readings)
        .values({
          clientId: req.user!.id,
          readerId,
          readingType,
          ratePerMinute,
          agoraChannel: channelName,
          status: "pending",
        })
        .returning();

      // Notify reader via WebSocket
      wsService.send(readerId, "reading:request", {
        readingId: reading!.id,
        clientId: req.user!.id,
        readingType,
        clientName: req.user!.fullName ?? "Client",
      });

      logger.info(
        { readingId: reading!.id, clientId: req.user!.id, readerId, readingType },
        "Reading request created",
      );

      res.status(201).json({ reading });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/readings/:id/accept — Reader accepts request ─────────────────
router.post("/:id/accept", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);

    if (isNaN(readingId)) {
      res.status(400).json({ error: "Invalid reading ID" });
      return;
    }

    const [reading] = await db
      .select()
      .from(readings)
      .where(
        and(
          eq(readings.id, readingId),
          eq(readings.readerId, req.user!.id),
          eq(readings.status, "pending"),
        ),
      );

    if (!reading) {
      res.status(404).json({ error: "Reading not found or not pending" });
      return;
    }

    const now = new Date();
    const [updated] = await db
      .update(readings)
      .set({ status: "accepted", updatedAt: now })
      .where(eq(readings.id, readingId))
      .returning();

    // Notify client that the reading was accepted
    wsService.send(reading.clientId, "reading:accepted", {
      readingId,
      agoraChannel: reading.agoraChannel,
    });

    logger.info({ readingId }, "Reading accepted by reader");
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/readings/:id/agora-token — Get Agora token ───────────────────
router.post(
  "/:id/agora-token",
  requireAuth,
  requireParticipant,
  async (req, res, next) => {
    try {
      const reading = req.reading!;

      if (!reading.agoraChannel) {
        res.status(400).json({ error: "No Agora channel for this reading" });
        return;
      }

      // Only allow token generation for accepted or in_progress readings
      if (
        reading.status !== "accepted" &&
        reading.status !== "in_progress" &&
        reading.status !== "active"
      ) {
        res.status(409).json({ error: "Reading is not in a joinable state" });
        return;
      }

      const tokens = AgoraService.generateTokens(
        reading.agoraChannel,
        req.user!.id,
      );

      res.json({
        rtcToken: tokens.rtcToken,
        rtmToken: tokens.rtmToken,
        channelName: tokens.channelName,
        uid: tokens.uid,
        expiration: tokens.expiration,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/readings/:id/start — Both joined, start billing ──────────────
router.post(
  "/:id/start",
  requireAuth,
  requireParticipant,
  async (req, res, next) => {
    try {
      const db = getDb();
      const reading = req.reading!;

      // Only start billing if reading is in accepted state
      if (reading.status !== "accepted" && reading.status !== "in_progress") {
        // If already active, just acknowledge
        if (reading.status === "active") {
          res.json({ message: "Billing already started", readingId: reading.id });
          return;
        }
        res
          .status(409)
          .json({ error: "Reading is not in a startable state" });
        return;
      }

      const now = new Date();
      const [updated] = await db
        .update(readings)
        .set({
          status: "active",
          startedAt: now,
          lastHeartbeat: now,
          updatedAt: now,
        })
        .where(eq(readings.id, reading.id))
        .returning();

      // Notify both participants
      wsService.broadcast(
        [reading.clientId, reading.readerId],
        "reading:started",
        { readingId: reading.id },
      );

      logger.info(
        { readingId: reading.id, clientId: reading.clientId, readerId: reading.readerId },
        "Reading session started, billing active",
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/readings/:id/heartbeat — Keep session alive ──────────────────
router.post(
  "/:id/heartbeat",
  requireAuth,
  requireParticipant,
  async (req, res, next) => {
    try {
      const db = getDb();
      const reading = req.reading!;

      if (reading.status !== "active" && reading.status !== "paused") {
        res.status(409).json({ error: "Reading is not active" });
        return;
      }

      await db
        .update(readings)
        .set({ lastHeartbeat: new Date() })
        .where(eq(readings.id, reading.id));

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/readings/:id/end — End session, finalize billing ─────────────
router.post(
  "/:id/end",
  requireAuth,
  requireParticipant,
  async (req, res, next) => {
    try {
      const db = getDb();
      const reading = req.reading!;

      if (
        reading.status !== "active" &&
        reading.status !== "paused" &&
        reading.status !== "in_progress" &&
        reading.status !== "accepted"
      ) {
        res.status(409).json({ error: "Reading is not active" });
        return;
      }

      const now = new Date();
      const durationSeconds = reading.startedAt
        ? Math.floor((now.getTime() - reading.startedAt.getTime()) / 1000)
        : 0;
      const billedMinutes = Math.ceil(durationSeconds / 60);
      const totalCharged = billedMinutes * reading.ratePerMinute;
      const readerEarned = Math.floor(totalCharged * 0.7);
      const platformEarned = totalCharged - readerEarned;

      await db.transaction(async (tx) => {
        // Finalize the reading
        await tx
          .update(readings)
          .set({
            status: "completed",
            completedAt: now,
            durationSeconds,
            totalCharged,
            readerEarned,
            platformEarned,
            paymentStatus: "paid",
            updatedAt: now,
          })
          .where(eq(readings.id, reading.id));

        if (totalCharged > 0) {
          // Charge client
          const [clientBefore] = await tx
            .select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, reading.clientId));
          const clientBalanceBefore = clientBefore?.balance ?? 0;

          const [clientAfter] = await tx
            .update(users)
            .set({
              balance: sql`${users.balance} - ${totalCharged}`,
              updatedAt: now,
            })
            .where(eq(users.id, reading.clientId))
            .returning({ balance: users.balance });

          await tx.insert(transactions).values({
            userId: reading.clientId,
            readingId: reading.id,
            type: "reading_charge",
            amount: -totalCharged,
            balanceBefore: clientBalanceBefore,
            balanceAfter: clientAfter!.balance,
            note: `Reading #${reading.id}: ${billedMinutes} min`,
          });

          // Credit reader (70%)
          const [readerBefore] = await tx
            .select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, reading.readerId));
          const readerBalanceBefore = readerBefore?.balance ?? 0;

          const [readerAfter] = await tx
            .update(users)
            .set({
              balance: sql`${users.balance} + ${readerEarned}`,
              totalReadings: sql`${users.totalReadings} + 1`,
              updatedAt: now,
            })
            .where(eq(users.id, reading.readerId))
            .returning({ balance: users.balance });

          await tx.insert(transactions).values({
            userId: reading.readerId,
            readingId: reading.id,
            type: "reader_payout",
            amount: readerEarned,
            balanceBefore: readerBalanceBefore,
            balanceAfter: readerAfter!.balance,
            note: `Earned from reading #${reading.id}`,
          });
        }
      });

      // Notify both participants
      wsService.broadcast(
        [reading.clientId, reading.readerId],
        "reading:ended",
        { readingId: reading.id, durationSeconds, totalCharged, readerEarned },
      );

      logger.info(
        {
          readingId: reading.id,
          durationSeconds,
          totalCharged,
          readerEarned,
          platformEarned,
        },
        "Reading ended and billing finalized",
      );

      res.json({
        readingId: reading.id,
        durationSeconds,
        totalCharged,
        readerEarned,
        platformEarned,
        duration: durationSeconds,
        totalCost: totalCharged,
        ratePerMinute: reading.ratePerMinute,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/readings/:id/rate — Submit rating and review ─────────────────
const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

router.post(
  "/:id/rate",
  requireAuth,
  validateBody(rateSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const readingId = parseInt(req.params.id!, 10);
      if (isNaN(readingId)) {
        res.status(400).json({ error: "Invalid reading ID" });
        return;
      }

      const { rating, review } = req.body;

      const [reading] = await db
        .select()
        .from(readings)
        .where(
          and(
            eq(readings.id, readingId),
            eq(readings.clientId, req.user!.id),
            eq(readings.status, "completed"),
          ),
        );

      if (!reading) {
        res.status(404).json({ error: "Completed reading not found" });
        return;
      }

      if (reading.rating !== null) {
        res.status(409).json({ error: "Reading already rated" });
        return;
      }

      const [updated] = await db
        .update(readings)
        .set({ rating, review: review || null, updatedAt: new Date() })
        .where(eq(readings.id, readingId))
        .returning();

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/readings/:id/message — Send chat message ─────────────────────
const messageSchema = z.object({
  content: z.string().min(1).max(5000),
});

router.post(
  "/:id/message",
  requireAuth,
  requireParticipant,
  validateBody(messageSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const reading = req.reading!;

      if (reading.readingType !== "chat") {
        res.status(400).json({ error: "Messages only for chat readings" });
        return;
      }

      if (reading.status !== "active" && reading.status !== "in_progress") {
        res.status(409).json({ error: "Reading is not active" });
        return;
      }

      const message = {
        senderId: req.user!.id,
        content: req.body.content,
        timestamp: Date.now(),
      };

      // Append message to chat transcript
      const currentTranscript = (reading.chatTranscript as any[]) ?? [];
      currentTranscript.push(message);

      await db
        .update(readings)
        .set({
          chatTranscript: currentTranscript,
          updatedAt: new Date(),
        })
        .where(eq(readings.id, reading.id));

      // Notify the other participant via WebSocket
      const otherUserId =
        req.user!.id === reading.clientId
          ? reading.readerId
          : reading.clientId;

      wsService.send(otherUserId, "reading:message", {
        readingId: reading.id,
        message,
      });

      res.json({ ok: true, message });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/readings/client — Client's reading history ─────────────────────
router.get("/client", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await db
      .select()
      .from(readings)
      .where(eq(readings.clientId, req.user!.id))
      .orderBy(desc(readings.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/readings/reader — Reader's session history ─────────────────────
router.get("/reader", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();

    if (req.user!.role !== "reader" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Reader access required" });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await db
      .select()
      .from(readings)
      .where(eq(readings.readerId, req.user!.id))
      .orderBy(desc(readings.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/readings/history — Combined history (backward compat) ──────────
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await db
      .select()
      .from(readings)
      .where(or(eq(readings.clientId, userId), eq(readings.readerId, userId)))
      .orderBy(desc(readings.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/readings/:id — Single reading detail ──────────────────────────
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);

    if (isNaN(readingId)) {
      res.status(400).json({ error: "Invalid reading ID" });
      return;
    }

    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));

    if (!reading) {
      res.status(404).json({ error: "Reading not found" });
      return;
    }

    // Only participants and admins can view
    if (
      reading.clientId !== req.user!.id &&
      reading.readerId !== req.user!.id &&
      req.user!.role !== "admin"
    ) {
      res.status(403).json({ error: "Not a participant" });
      return;
    }

    res.json(reading);
  } catch (err) {
    next(err);
  }
});

export default router;
