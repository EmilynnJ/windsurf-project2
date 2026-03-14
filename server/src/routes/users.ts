import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/db';
import { users, readings, transactions } from '../db/schema';
import { checkJwt } from '../middleware/auth';
import { resolveUser, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/readers — list all readers (Public)
router.get('/readers', async (_req, res, next) => {
  try {
    const allReaders = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        specialties: users.specialties,
        isOnline: users.isOnline,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
      })
      .from(users)
      .where(eq(users.role, 'reader'));
    res.json(allReaders);
  } catch (err) { next(err); }
});

// GET /api/readers/online — list online readers (Public)
router.get('/readers/online', async (_req, res, next) => {
  try {
    const online = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        specialties: users.specialties,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
      })
      .from(users)
      .where(and(eq(users.role, 'reader'), eq(users.isOnline, true)));
    res.json(online);
  } catch (err) { next(err); }
});

// GET /api/readers/:id — reader profile with reviews (Public)
router.get('/readers/:id', async (req, res, next) => {
  try {
    const readerId = parseInt(req.params.id!, 10);
    if (isNaN(readerId)) throw new AppError(400, 'Invalid reader ID');

    const [reader] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, readerId), eq(users.role, 'reader')))
      .limit(1);
    if (!reader) throw new AppError(404, 'Reader not found');

    const recentReviews = await db
      .select({
        id: readings.id,
        rating: readings.rating,
        review: readings.review,
        createdAt: readings.createdAt,
        clientId: readings.clientId,
      })
      .from(readings)
      .where(and(eq(readings.readerId, readerId), eq(readings.status, 'completed')))
      .orderBy(desc(readings.createdAt))
      .limit(20);

    // Strip sensitive fields from public profile
    const { auth0Id, stripeAccountId, stripeCustomerId, accountBalance, totalEarnings, totalSpent, ...publicProfile } = reader;
    res.json({ ...publicProfile, reviews: recentReviews.filter((r) => r.rating !== null) });
  } catch (err) { next(err); }
});

// Reader-only routes
const statusSchema = z.object({ isOnline: z.boolean() });
const pricingSchema = z.object({
  pricingChat: z.number().int().min(0).optional(),
  pricingVoice: z.number().int().min(0).optional(),
  pricingVideo: z.number().int().min(0).optional(),
});

// PUT /api/readers/:id/status
router.put('/readers/:id/status', checkJwt, resolveUser, requireRole('reader'), validate(statusSchema),
  async (req, res, next) => {
    try {
      const readerId = parseInt(req.params.id!, 10);
      if (readerId !== req.user!.id) throw new AppError(403, 'Can only update your own status');
      const { isOnline } = req.body as z.infer<typeof statusSchema>;
      const [updated] = await db.update(users).set({ isOnline }).where(eq(users.id, readerId)).returning();
      res.json({ id: updated!.id, isOnline: updated!.isOnline });
    } catch (err) { next(err); }
  },
);

// PUT /api/readers/:id/pricing
router.put('/readers/:id/pricing', checkJwt, resolveUser, requireRole('reader'), validate(pricingSchema),
  async (req, res, next) => {
    try {
      const readerId = parseInt(req.params.id!, 10);
      if (readerId !== req.user!.id) throw new AppError(403, 'Can only update your own pricing');
      const pricing = req.body as z.infer<typeof pricingSchema>;
      const updates: Record<string, number> = {};
      if (pricing.pricingChat !== undefined) updates.pricingChat = pricing.pricingChat;
      if (pricing.pricingVoice !== undefined) updates.pricingVoice = pricing.pricingVoice;
      if (pricing.pricingVideo !== undefined) updates.pricingVideo = pricing.pricingVideo;
      if (Object.keys(updates).length === 0) throw new AppError(400, 'No pricing fields provided');
      const [updated] = await db.update(users).set(updates).where(eq(users.id, readerId)).returning();
      res.json({ id: updated!.id, pricingChat: updated!.pricingChat, pricingVoice: updated!.pricingVoice, pricingVideo: updated!.pricingVideo });
    } catch (err) { next(err); }
  },
);

// GET /api/users/:id/readings
router.get('/users/:id/readings', checkJwt, resolveUser, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id!, 10);
    if (userId !== req.user!.id && req.user!.role !== 'admin') throw new AppError(403, 'Can only view your own reading history');
    const col = req.user!.role === 'reader' ? readings.readerId : readings.clientId;
    const history = await db.select().from(readings).where(eq(col, userId)).orderBy(desc(readings.createdAt)).limit(50);
    res.json(history);
  } catch (err) { next(err); }
});

// GET /api/users/:id/transactions
router.get('/users/:id/transactions', checkJwt, resolveUser, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id!, 10);
    if (userId !== req.user!.id && req.user!.role !== 'admin') throw new AppError(403, 'Can only view your own transactions');
    const txns = await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt)).limit(50);
    res.json(txns);
  } catch (err) { next(err); }
});

export default router;
