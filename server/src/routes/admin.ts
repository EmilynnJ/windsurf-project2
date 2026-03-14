import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
  users,
  readings,
  transactions,
  forumPosts,
  forumComments,
  forumFlags,
} from '../db/schema';
import { checkJwt } from '../middleware/auth';
import { resolveUser, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createPayout,
  createConnectAccount,
  refundReading,
} from '../services/stripe-service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require admin role
router.use(checkJwt, resolveUser, requireRole('admin'));

// ─── Schemas ────────────────────────────────────────────────────────────────

const createReaderSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  username: z.string().min(1).max(50).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
  pricingChat: z.number().int().min(0).default(0),
  pricingVoice: z.number().int().min(0).default(0),
  pricingVideo: z.number().int().min(0).default(0),
  auth0Id: z.string().min(1),
});

const updateReaderSchema = z.object({
  fullName: z.string().max(100).optional(),
  username: z.string().max(50).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
  pricingChat: z.number().int().min(0).optional(),
  pricingVoice: z.number().int().min(0).optional(),
  pricingVideo: z.number().int().min(0).optional(),
  isOnline: z.boolean().optional(),
});

const balanceAdjustSchema = z.object({
  amount: z.number().int(),
  description: z.string().min(1).max(500),
});

// ─── GET /api/admin/users ────────────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    res.json({
      users: allUsers.map(({ auth0Id, ...u }) => u),
      pagination: { page, limit, total: countResult?.count ?? 0 },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/readers — create reader account ────────────────────────

router.post(
  '/readers',
  validate(createReaderSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createReaderSchema>;

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.auth0Id, body.auth0Id))
        .limit(1);
      if (existing) throw new AppError(409, 'A user with this Auth0 ID already exists');

      const [reader] = await db
        .insert(users)
        .values({
          auth0Id: body.auth0Id,
          email: body.email,
          fullName: body.fullName,
          username: body.username ?? null,
          bio: body.bio ?? null,
          specialties: body.specialties ?? null,
          role: 'reader',
          pricingChat: body.pricingChat,
          pricingVoice: body.pricingVoice,
          pricingVideo: body.pricingVideo,
          accountBalance: 0,
          totalEarnings: 0,
          totalSpent: 0,
          isOnline: false,
        })
        .returning();

      logger.info(
        { readerId: reader!.id, email: body.email },
        'Reader account created by admin',
      );
      res.status(201).json(reader);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/admin/readers/:id — edit reader ───────────────────────────────

router.put(
  '/readers/:id',
  validate(updateReaderSchema),
  async (req, res, next) => {
    try {
      const readerId = parseInt(req.params.id!, 10);
      if (isNaN(readerId)) throw new AppError(400, 'Invalid reader ID');

      const body = req.body as z.infer<typeof updateReaderSchema>;
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) updates[key] = value;
      }
      if (Object.keys(updates).length === 0) throw new AppError(400, 'No fields to update');

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, readerId))
        .returning();
      if (!updated) throw new AppError(404, 'Reader not found');

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/admin/readings — all readings ─────────────────────────────────

router.get('/readings', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const allReadings = await db
      .select()
      .from(readings)
      .orderBy(desc(readings.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(readings);

    res.json({
      readings: allReadings,
      pagination: { page, limit, total: countResult?.count ?? 0 },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/transactions — all transactions ─────────────────────────

router.get('/transactions', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const txns = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions);

    res.json({
      transactions: txns,
      pagination: { page, limit, total: countResult?.count ?? 0 },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/users/:id/balance — manual balance adjustment ──────────

router.post(
  '/users/:id/balance',
  validate(balanceAdjustSchema),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id!, 10);
      if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

      const { amount, description } = req.body as z.infer<typeof balanceAdjustSchema>;

      // Get current balance
      const [currentUser] = await db
        .select({ accountBalance: users.accountBalance })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser) throw new AppError(404, 'User not found');
      const balanceBefore = currentUser.accountBalance;

      const [updated] = await db
        .update(users)
        .set({ accountBalance: sql`${users.accountBalance} + ${amount}` })
        .where(eq(users.id, userId))
        .returning({ id: users.id, accountBalance: users.accountBalance });

      if (!updated) throw new AppError(404, 'User not found');

      await db.insert(transactions).values({
        userId,
        type: 'adjustment',
        amount,
        balanceBefore,
        balanceAfter: updated.accountBalance,
        description: `Admin adjustment: ${description}`,
      });

      logger.info(
        { userId, amount, adminId: req.user!.id, description },
        'Balance adjusted by admin',
      );
      res.json({ userId: updated.id, newBalance: updated.accountBalance });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/admin/flags — flagged content queue ───────────────────────────

router.get('/flags', async (req, res, next) => {
  try {
    const flags = await db
      .select()
      .from(forumFlags)
      .where(eq(forumFlags.resolved, false))
      .orderBy(desc(forumFlags.createdAt))
      .limit(50);
    res.json(flags);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/flags/:id/resolve — resolve flag ─────────────────────────

router.put('/flags/:id/resolve', async (req, res, next) => {
  try {
    const flagId = parseInt(req.params.id!, 10);
    if (isNaN(flagId)) throw new AppError(400, 'Invalid flag ID');

    const [updated] = await db
      .update(forumFlags)
      .set({ resolved: true, reviewedAt: new Date() })
      .where(eq(forumFlags.id, flagId))
      .returning();

    if (!updated) throw new AppError(404, 'Flag not found');
    logger.info({ flagId, adminId: req.user!.id }, 'Flag resolved by admin');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/posts/:id — delete post ──────────────────────────────

router.delete('/posts/:id', async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id!, 10);
    if (isNaN(postId)) throw new AppError(400, 'Invalid post ID');

    await db
      .update(forumPosts)
      .set({ isDeleted: true })
      .where(eq(forumPosts.id, postId));

    // Resolve any flags for this post
    await db
      .update(forumFlags)
      .set({ resolved: true, reviewedAt: new Date() })
      .where(eq(forumFlags.postId, postId));

    logger.info({ postId, adminId: req.user!.id }, 'Post deleted by admin');
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/comments/:id — delete comment ────────────────────────

router.delete('/comments/:id', async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id!, 10);
    if (isNaN(commentId)) throw new AppError(400, 'Invalid comment ID');

    const [comment] = await db
      .select()
      .from(forumComments)
      .where(eq(forumComments.id, commentId))
      .limit(1);

    await db
      .update(forumComments)
      .set({ isDeleted: true })
      .where(eq(forumComments.id, commentId));

    if (comment) {
      await db
        .update(forumPosts)
        .set({ commentCount: sql`GREATEST(${forumPosts.commentCount} - 1, 0)` })
        .where(eq(forumPosts.id, comment.postId));
    }

    await db
      .update(forumFlags)
      .set({ resolved: true, reviewedAt: new Date() })
      .where(eq(forumFlags.commentId, commentId));

    logger.info({ commentId, adminId: req.user!.id }, 'Comment deleted by admin');
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/payouts/:userId — trigger payout for reader ────────────

router.post('/payouts/:userId', async (req, res, next) => {
  try {
    const readerId = parseInt(req.params.userId!, 10);
    if (isNaN(readerId)) throw new AppError(400, 'Invalid user ID');
    const result = await createPayout(readerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/refunds/:readingId — refund a reading ─────────────────

router.post('/refunds/:readingId', async (req, res, next) => {
  try {
    const readingId = parseInt(req.params.readingId!, 10);
    if (isNaN(readingId)) throw new AppError(400, 'Invalid reading ID');

    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId))
      .limit(1);
    if (!reading) throw new AppError(404, 'Reading not found');
    if (reading.status !== 'completed') throw new AppError(400, 'Can only refund completed readings');

    const refundAmount = reading.totalCost;
    if (refundAmount <= 0) throw new AppError(400, 'Nothing to refund');

    await refundReading(readingId, reading.clientId, refundAmount);

    // Update reading status
    await db
      .update(readings)
      .set({ status: 'cancelled', paymentStatus: 'refunded' })
      .where(eq(readings.id, readingId));

    logger.info(
      { readingId, clientId: reading.clientId, refundAmount, adminId: req.user!.id },
      'Reading refunded',
    );
    res.json({ readingId, refundAmount, message: 'Reading refunded successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/stats — dashboard stats ─────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const [readerCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'reader'));

    const [readingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(readings);

    const [revenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` })
      .from(transactions)
      .where(eq(transactions.type, 'top_up'));

    res.json({
      totalUsers: userCount?.count ?? 0,
      totalReaders: readerCount?.count ?? 0,
      totalReadings: readingCount?.count ?? 0,
      totalRevenue: revenue?.total ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
