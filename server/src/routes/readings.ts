import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/db';
import { users, readings } from '@soulseer/shared/schema';
import { checkJwt } from '../middleware/auth';
import { resolveUser, requireRole, requireParticipant } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { strictLimiter } from '../middleware/rate-limit';
import { AgoraService } from '../services/agora-service';
import { billingService } from '../services/billing-service';
import { wsService } from '../services/websocket-service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();
const MIN_BALANCE_CENTS = 500;

const createReadingSchema = z.object({
  readerId: z.number().int().positive(),
  type: z.enum(['chat', 'voice', 'video']),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// POST /api/readings — create reading request (Client, checks min $5 balance)
router.post(
  '/',
  strictLimiter, checkJwt, resolveUser, requireRole('client'),
  validate(createReadingSchema),
  async (req, res, next) => {
    try {
      const client = req.user!;
      const { readerId, type } = req.body as z.infer<typeof createReadingSchema>;

      const [reader] = await db.select().from(users)
        .where(and(eq(users.id, readerId), eq(users.role, 'reader'))).limit(1);
      if (!reader) throw new AppError(404, 'Reader not found');
      if (!reader.isOnline) throw new AppError(400, 'Reader is not currently available');

      const pricePerMinute = type === 'chat' ? reader.pricingChat
        : type === 'voice' ? reader.pricingVoice : reader.pricingVideo;
      if (pricePerMinute <= 0) throw new AppError(400, `This reader does not offer ${type} readings`);
      if (client.accountBalance < MIN_BALANCE_CENTS) {
        throw new AppError(400, `Minimum balance of $${(MIN_BALANCE_CENTS / 100).toFixed(2)} required.`);
      }

      const [reading] = await db.insert(readings).values({
        readerId, clientId: client.id, type, status: 'pending', pricePerMinute,
        channelName: 'pending',
        chatTranscript: type === 'chat' ? [] : null,
      }).returning();

      const channelName = `reading_${reading!.id}`;
      const [updated] = await db.update(readings).set({ channelName })
        .where(eq(readings.id, reading!.id)).returning();

      wsService.send(readerId, 'reading:requested', {
        readingId: updated!.id, clientId: client.id,
        clientName: client.fullName ?? client.username, type, pricePerMinute,
      });

      logger.info({ readingId: updated!.id, clientId: client.id, readerId, type }, 'Reading created');
      res.status(201).json(updated);
    } catch (err) { next(err); }
  },
);

// PUT /api/readings/:id/accept — reader accepts (Reader only)
router.put('/:id/accept', checkJwt, resolveUser, requireRole('reader'), async (req, res, next) => {
  try {
    const readingId = parseInt(req.params.id!, 10);
    if (isNaN(readingId)) throw new AppError(400, 'Invalid reading ID');

    const [reading] = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
    if (!reading) throw new AppError(404, 'Reading not found');
    if (reading.readerId !== req.user!.id) throw new AppError(403, 'Only the assigned reader can accept');
    if (reading.status !== 'pending') throw new AppError(400, `Cannot accept: status is ${reading.status}`);

    const [updated] = await db.update(readings).set({ status: 'accepted' })
      .where(eq(readings.id, readingId)).returning();

    wsService.send(reading.clientId, 'reading:accepted', { readingId, readerId: req.user!.id });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/readings/:id/agora-token — get Agora token (Participant only)
router.post('/:id/agora-token', checkJwt, resolveUser, requireParticipant, async (req, res, next) => {
  try {
    const reading = req.reading!;
    if (reading.status !== 'accepted' && reading.status !== 'in_progress') {
      throw new AppError(400, 'Reading must be accepted or in progress');
    }
    const tokens = AgoraService.generateTokens(reading.channelName, req.user!.id, 'publisher');
    res.json(tokens);
  } catch (err) { next(err); }
});

// POST /api/readings/:id/start — both joined, start billing (Participant)
router.post('/:id/start', checkJwt, resolveUser, requireParticipant, async (req, res, next) => {
  try {
    const reading = req.reading!;
    if (reading.status !== 'accepted') throw new AppError(400, `Cannot start: status is ${reading.status}`);

    const now = new Date();
    const [updated] = await db.update(readings)
      .set({ status: 'in_progress', startedAt: now })
      .where(eq(readings.id, reading.id)).returning();

    billingService.startBilling(reading.id, reading.clientId, reading.readerId, reading.pricePerMinute);
    wsService.broadcast([reading.clientId, reading.readerId], 'reading:started', {
      readingId: reading.id, startedAt: now.toISOString(),
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/readings/:id/end — end session (Participant)
router.post('/:id/end', checkJwt, resolveUser, requireParticipant, async (req, res, next) => {
  try {
    const reading = req.reading!;
    if (reading.status !== 'in_progress' && reading.status !== 'accepted') {
      throw new AppError(400, `Cannot end: status is ${reading.status}`);
    }
    await billingService.finalizeReading(reading.id);
    const [final] = await db.select().from(readings).where(eq(readings.id, reading.id)).limit(1);
    res.json(final);
  } catch (err) { next(err); }
});

// POST /api/readings/:id/review — submit review (Client only, post-session)
router.post('/:id/review', checkJwt, resolveUser, requireParticipant, validate(reviewSchema), async (req, res, next) => {
  try {
    const reading = req.reading!;
    if (reading.clientId !== req.user!.id) throw new AppError(403, 'Only the client can leave a review');
    if (reading.status !== 'completed') throw new AppError(400, 'Can only review completed readings');
    if (reading.rating !== null) throw new AppError(400, 'Already reviewed');

    const { rating, review } = req.body as z.infer<typeof reviewSchema>;
    const [updated] = await db.update(readings).set({ rating, review: review ?? null })
      .where(eq(readings.id, reading.id)).returning();

    res.json({ readingId: updated!.id, rating: updated!.rating, review: updated!.review });
  } catch (err) { next(err); }
});

// GET /api/readings/:id — get reading details (Participant)
router.get('/:id', checkJwt, resolveUser, requireParticipant, async (req, res) => {
  res.json(req.reading);
});

// GET /api/readings/:id/messages — get chat messages (Participant)
router.get('/:id/messages', checkJwt, resolveUser, requireParticipant, async (req, res, next) => {
  try {
    const reading = req.reading!;
    if (reading.type !== 'chat') throw new AppError(400, 'Messages only available for chat readings');
    res.json({ messages: reading.chatTranscript ?? [] });
  } catch (err) { next(err); }
});

// POST /api/readings/:id/messages — send chat message (Participant)
router.post('/:id/messages', checkJwt, resolveUser, requireParticipant, validate(messageSchema), async (req, res, next) => {
  try {
    const reading = req.reading!;
    const user = req.user!;
    if (reading.type !== 'chat') throw new AppError(400, 'Messages only available for chat readings');
    if (reading.status !== 'in_progress') throw new AppError(400, 'Can only send messages during active reading');

    const { content } = req.body as z.infer<typeof messageSchema>;
    const newMsg = {
      senderId: user.id,
      senderName: user.fullName ?? user.username ?? `User ${user.id}`,
      content,
      timestamp: new Date().toISOString(),
    };

    const current = (reading.chatTranscript ?? []) as Array<typeof newMsg>;
    await db.update(readings).set({ chatTranscript: [...current, newMsg] }).where(eq(readings.id, reading.id));

    const otherId = user.id === reading.clientId ? reading.readerId : reading.clientId;
    wsService.send(otherId, 'message:new', { readingId: reading.id, message: newMsg });

    res.status(201).json(newMsg);
  } catch (err) { next(err); }
});

export default router;
