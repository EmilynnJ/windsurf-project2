<<<<<<< HEAD
import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ReadingService } from '../services/reading-service';
import { acquireResource, startRecording, stopRecording } from '../services/agora-rtmp';
import { z } from 'zod';
import { db } from '../db/db';
import { readings, users } from '@soulseer/shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = express.Router();

// Extend Express Request type to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Validation schemas
const CreateReadingSchema = z.object({
  readerId: z.number().int().positive(),
  type: z.enum(['chat', 'voice', 'video']),
});

const MessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

// Create a new reading request
router.post('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const { readerId, type } = CreateReadingSchema.parse(req.body);
    const clientId = req.user!.id;

    // Get reader's pricing based on type
    const reader = await db.query.users.findFirst({
      where: eq(users.id, readerId),
      columns: { pricingChat: true, pricingVoice: true, pricingVideo: true },
    });

    if (!reader) {
      return res.status(404).json({ error: 'Reader not found' });
    }

    let pricePerMinute = 0;
    if (type === 'chat') pricePerMinute = reader.pricingChat;
    if (type === 'voice') pricePerMinute = reader.pricingVoice;
    if (type === 'video') pricePerMinute = reader.pricingVideo;

    const reading = await ReadingService.createReading({
      readerId,
      clientId,
      type,
      pricePerMinute,
    });

    res.status(201).json(reading);
    } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Error creating reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reading by ID
router.get('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.getReadingById(id);

    if (!reading) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    // Check if user is authorized to view this reading
    if (req.user!.id !== reading.clientId && req.user!.id !== reading.readerId) {
      return res.status(403).json({ error: 'Unauthorized to view this reading' });
    }

    res.json(reading);
  } catch (error) {
    console.error('Error getting reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept a reading request (reader only)
router.patch('/:id/accept', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.acceptReading(id, req.user!.id);

    res.json(reading);
  } catch (error) {
    console.error('Error accepting reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a reading session
router.patch('/:id/start', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.startReading(id, req.user!.id);

    // Start Agora cloud recording
    try {
      const token = await ReadingService.generateAgoraToken(id, req.user!.id);
      const uid = String(req.user!.id);
      const resourceId = await acquireResource(reading.channelName, uid);
      const sid = await startRecording(reading.channelName, uid, resourceId, token);

      // Store resourceId and sid on the reading record
      await db.update(readings)
        .set({ resourceId, sid })
        .where(eq(readings.id, id));

      res.json({ ...reading, resourceId, sid });
    } catch (recordingError) {
      console.error('Failed to start cloud recording:', recordingError);
      // Continue without recording — session is still valid
      res.json(reading);
    }
  } catch (error) {
    console.error('Error starting reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End a reading session
router.patch('/:id/end', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.endReading(id, req.user!.id);

    // Stop Agora cloud recording if resourceId and sid exist
    try {
      const readingRecord = await db.query.readings.findFirst({
        where: eq(readings.id, id),
        columns: { resourceId: true, sid: true, channelName: true },
      });

      if (readingRecord?.resourceId && readingRecord?.sid) {
        await stopRecording(
          readingRecord.channelName,
          String(req.user!.id),
          readingRecord.resourceId,
          readingRecord.sid
        );
      }
    } catch (recordingError) {
      console.error('Failed to stop cloud recording:', recordingError);
      // Continue — session is already ended
    }

    res.json(reading);
  } catch (error) {
    console.error('Error ending reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a reading request
router.patch('/:id/cancel', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.cancelReading(id, req.user!.id);

    res.json(reading);
  } catch (error) {
    console.error('Error cancelling reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a message to a chat reading
router.post('/:id/messages', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const { content } = MessageSchema.parse(req.body);
    const senderId = req.user!.id;

    await ReadingService.addMessage(id, senderId, content);

    res.status(201).json({ message: 'Message added successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Error adding message:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's readings
router.get('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    const userId = req.user!.id;

    // Validate query parameters
    const parsedLimit = parseInt(limit as string) || 20;
    const parsedOffset = parseInt(offset as string) || 0;
    
    let parsedStatus: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | undefined;
    if (status && typeof status === 'string' && 
        ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      parsedStatus = status as 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    }

    const readings = await ReadingService.getUserReadings(userId, parsedLimit, parsedOffset);

    // Filter by status if provided
    const filteredReadings = parsedStatus 
      ? readings.filter(r => r.status === parsedStatus)
      : readings;

    res.json(filteredReadings);
  } catch (error) {
    console.error('Error getting user readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get readings for a specific reader
router.get('/reader/:readerId', authMiddleware, async (req: any, res: Response) => {
  try {
    const readerId = parseInt(req.params.readerId);
    if (isNaN(readerId)) {
      return res.status(400).json({ error: 'Invalid reader ID' });
    }

    const { status } = req.query;
    let parsedStatus: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | undefined;
    if (status && typeof status === 'string' && 
        ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      parsedStatus = status as 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    }

    const readings = await ReadingService.getReaderReadings(readerId, parsedStatus);

    res.json(readings);
  } catch (error) {
    console.error('Error getting reader readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get readings for a specific client
router.get('/client/:clientId', authMiddleware, async (req: any, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const { status } = req.query;
    let parsedStatus: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | undefined;
    if (status && typeof status === 'string' && 
        ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      parsedStatus = status as 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    }

    const readings = await ReadingService.getClientReadings(clientId, parsedStatus);

    res.json(readings);
  } catch (error) {
    console.error('Error getting client readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate Agora token for a reading
router.post('/:id/token', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const { role = 'publisher' } = req.body;
    const validRoles = ['publisher', 'subscriber'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be publisher or subscriber' });
    }

    const token = await ReadingService.generateAgoraToken(id, req.user!.id, role);

    res.json({ token });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle disconnection
router.post('/:id/disconnect', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    await ReadingService.handleDisconnection(id, req.user!.id);

    res.json({ message: 'Disconnection handled' });
  } catch (error) {
    console.error('Error handling disconnection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle reconnection
router.post('/:id/reconnect', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    await ReadingService.handleReconnection(id, req.user!.id);

    res.json({ message: 'Reconnection handled' });
  } catch (error) {
    console.error('Error handling reconnection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
=======
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

// ─── GET /api/readings/reader/pending — Reader's pending incoming requests ──
router.get("/reader/pending", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Reader access required" });
      return;
    }
    const result = await db
      .select({
        id: readings.id,
        clientId: readings.clientId,
        readingType: readings.readingType,
        ratePerMinute: readings.ratePerMinute,
        status: readings.status,
        createdAt: readings.createdAt,
        clientName: users.fullName,
        clientUsername: users.username,
        clientAvatar: users.profileImage,
      })
      .from(readings)
      .innerJoin(users, eq(readings.clientId, users.id))
      .where(and(eq(readings.readerId, req.user!.id), eq(readings.status, "pending")))
      .orderBy(desc(readings.createdAt));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/readings/:id/decline — Reader declines request ───────────────
router.post("/:id/decline", requireAuth, async (req, res, next) => {
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
    await db
      .update(readings)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(readings.id, readingId));

    wsService.send(reading.clientId, "reading:cancelled", {
      readingId,
      reason: "reader_declined",
    });

    logger.info({ readingId }, "Reading declined by reader");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

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

      // Only allow token generation for accepted or active readings
      if (
        reading.status !== "accepted" &&
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
      if (reading.status !== "accepted") {
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
        reading.status !== "accepted"
      ) {
        res.status(409).json({ error: "Reading is not active" });
        return;
      }

      // CRITICAL: Re-fetch the reading inside the transaction to get the latest
      // billing-service-accumulated totals. Do NOT recalculate from elapsed time
      // -- the billing service has already been deducting per-minute charges.
      // We only finalize the record and credit the reader here.

      const now = new Date();

      let finalReading: any;

      await db.transaction(async (tx) => {
        // Re-read the reading with latest accumulated billing totals
        const [fresh] = await tx
          .select()
          .from(readings)
          .where(eq(readings.id, reading.id));

        if (!fresh) throw new Error("Reading not found");

        // Prevent double-finalization
        if (fresh.status === "completed") {
          finalReading = fresh;
          return;
        }

        const durationSeconds = fresh.startedAt
          ? Math.floor((now.getTime() - fresh.startedAt.getTime()) / 1000)
          : fresh.durationSeconds;

        // Use the already-accumulated totals from the billing service ticks.
        // These were charged incrementally each minute -- do NOT re-charge.
        const totalCharged = fresh.totalCharged;
        const readerEarned = fresh.readerEarned;
        const platformEarned = fresh.platformEarned;

        // Finalize the reading record
        await tx
          .update(readings)
          .set({
            status: "completed",
            completedAt: now,
            durationSeconds,
            paymentStatus: totalCharged > 0 ? "paid" : "pending",
            updatedAt: now,
          })
          .where(eq(readings.id, reading.id));

        // Credit reader balance (billing service deducted from client but
        // credits the reader only at session end via endReading)
        if (readerEarned > 0) {
          const [readerBefore] = await tx
            .select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, fresh.readerId));
          const readerBalanceBefore = readerBefore?.balance ?? 0;

          const [readerAfter] = await tx
            .update(users)
            .set({
              balance: sql`${users.balance} + ${readerEarned}`,
              totalReadings: sql`${users.totalReadings} + 1`,
              updatedAt: now,
            })
            .where(eq(users.id, fresh.readerId))
            .returning({ balance: users.balance });

          await tx.insert(transactions).values({
            userId: fresh.readerId,
            readingId: fresh.id,
            type: "reader_payout",
            amount: readerEarned,
            balanceBefore: readerBalanceBefore,
            balanceAfter: readerAfter!.balance,
            note: `Earned from reading #${fresh.id}`,
          });
        }

        // Record the client charge transaction (amount was already deducted
        // by billing service ticks, this is just the ledger entry)
        if (totalCharged > 0) {
          const [clientNow] = await tx
            .select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, fresh.clientId));

          await tx.insert(transactions).values({
            userId: fresh.clientId,
            readingId: fresh.id,
            type: "reading_charge",
            amount: -totalCharged,
            balanceBefore: (clientNow?.balance ?? 0) + totalCharged,
            balanceAfter: clientNow?.balance ?? 0,
            note: `Reading #${fresh.id}: ${Math.ceil(durationSeconds / 60)} min`,
          });
        }

        finalReading = {
          ...fresh,
          status: "completed",
          completedAt: now,
          durationSeconds,
          totalCharged,
          readerEarned,
          platformEarned,
        };
      });

      const r = finalReading;

      // Notify both participants
      wsService.broadcast(
        [reading.clientId, reading.readerId],
        "reading:ended",
        {
          readingId: reading.id,
          durationSeconds: r.durationSeconds,
          totalCharged: r.totalCharged,
          readerEarned: r.readerEarned,
        },
      );

      logger.info(
        {
          readingId: reading.id,
          durationSeconds: r.durationSeconds,
          totalCharged: r.totalCharged,
          readerEarned: r.readerEarned,
          platformEarned: r.platformEarned,
        },
        "Reading ended and billing finalized",
      );

      res.json({
        readingId: reading.id,
        durationSeconds: r.durationSeconds,
        totalCharged: r.totalCharged,
        readerEarned: r.readerEarned,
        platformEarned: r.platformEarned,
        duration: r.durationSeconds,
        totalCost: r.totalCharged,
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

      if (reading.status !== "active") {
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
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
