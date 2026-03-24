// ============================================================
// Admin Routes — User management, reader creation, moderation
//
// All routes require admin role (enforced by middleware).
// ============================================================

import { Router } from "express";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";
import crypto from "crypto";

import { getDb } from "../db/db";
import { users, readings, transactions, forumPosts, forumComments, forumFlags } from "../db/schema";
import { checkJwt } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/error-handler";
import { logger } from "../utils/logger";
import { config } from "../config";

// Stripe is optional — only initialize if key is present
const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: "2024-06-20" as any })
  : null;

const router = Router();

// All admin routes require auth + admin role
router.use(checkJwt);
router.use(requireRole("admin"));

// ── GET /api/admin/stats — Dashboard stats ─────────────────────────────
router.get("/stats", async (_req, res, next) => {
  try {
    const db = getDb();

    const [userCount] = await db.select({ count: count() }).from(users);
    const [readerCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "reader"));
    const [readingCount] = await db.select({ count: count() }).from(readings);
    const [activeReadingCount] = await db.select({ count: count() }).from(readings).where(eq(readings.status, "active"));
    const [flagCount] = await db.select({ count: count() }).from(forumFlags).where(eq(forumFlags.resolved, false));

    res.json({
      totalUsers: Number(userCount?.count ?? 0),
      totalReaders: Number(readerCount?.count ?? 0),
      totalReadings: Number(readingCount?.count ?? 0),
      activeReadings: Number(activeReadingCount?.count ?? 0),
      pendingFlags: Number(flagCount?.count ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/users — List all users ───────────────────────────────
router.get("/users", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        profileImage: users.profileImage,
        isOnline: users.isOnline,
        balance: users.balance,
        totalReadings: users.totalReadings,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/readers — Create a new reader account ───────────────
const createReaderSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  username: z.string().min(1).max(100),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  pricingChat: z.number().int().min(0).default(0),
  pricingVoice: z.number().int().min(0).default(0),
  pricingVideo: z.number().int().min(0).default(0),
  profileImage: z.string().url().optional(),
});

router.post("/readers", validate(createReaderSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;

    // Generate a temp auth0Id (reader logs in via Auth0 with credentials set by admin)
    const tempAuth0Id = `admin_created_${crypto.randomUUID()}`;
    // Generate initial password for the reader
    const initialPassword = crypto.randomBytes(8).toString("hex");

    // Create reader in DB
    const [reader] = await db
      .insert(users)
      .values({
        auth0Id: tempAuth0Id,
        email: body.email,
        fullName: body.fullName,
        username: body.username,
        role: "reader",
        bio: body.bio ?? null,
        specialties: body.specialties ?? null,
        pricingChat: body.pricingChat,
        pricingVoice: body.pricingVoice,
        pricingVideo: body.pricingVideo,
        profileImage: body.profileImage ?? null,
        balance: 0,
      })
      .returning();

    // Create Stripe Connect Express account if Stripe is configured
    if (stripe) {
      try {
        const account = await stripe.accounts.create({
          type: "express",
          email: body.email,
          metadata: { readerId: reader!.id.toString() },
        });

        await db
          .update(users)
          .set({ stripeAccountId: account.id, updatedAt: new Date() })
          .where(eq(users.id, reader!.id));

        // Generate onboarding link
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${config.corsOrigin}/dashboard`,
          return_url: `${config.corsOrigin}/dashboard`,
          type: "account_onboarding",
        });

        logger.info({ readerId: reader!.id, stripeAccount: account.id }, "Reader Stripe Connect created");

        res.status(201).json({
          reader: { ...reader, stripeAccountId: account.id },
          initialPassword,
          stripeOnboardingUrl: accountLink.url,
        });
        return;
      } catch (stripeErr) {
        logger.error({ err: stripeErr, readerId: reader!.id }, "Failed to create Stripe Connect");
      }
    }

    // Return without Stripe if not configured or failed
    res.status(201).json({
      reader,
      initialPassword,
      stripeOnboardingUrl: null,
      warning: stripe ? "Reader created but Stripe Connect setup failed." : "Stripe not configured.",
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/readers/:id — Update reader profile ────────────────
router.patch("/readers/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const readerId = parseInt(req.params.id!, 10);

    const allowedFields = [
      "fullName", "username", "bio", "specialties", "profileImage",
      "pricingChat", "pricingVoice", "pricingVideo",
    ];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "No valid fields to update");
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(and(eq(users.id, readerId), eq(users.role, "reader")))
      .returning();

    if (!updated) throw new AppError(404, "Reader not found");
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/readings — All readings ──────────────────────────────
router.get("/readings", async (req, res, next) => {
  try {
    const db = getDb();
    const status = req.query.status as string | undefined;
    const conditions = status ? eq(readings.status, status as any) : undefined;

    const result = await db
      .select()
      .from(readings)
      .where(conditions)
      .orderBy(desc(readings.createdAt))
      .limit(200);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/transactions — All transactions ──────────────────────
router.get("/transactions", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        readingId: transactions.readingId,
        type: transactions.type,
        amount: transactions.amount,
        balanceAfter: transactions.balanceAfter,
        note: transactions.note,
        stripePaymentIntentId: transactions.stripePaymentIntentId,
        createdAt: transactions.createdAt,
        userName: users.fullName,
        userEmail: users.email,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(500);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/balance-adjust — Manual balance adjustment ──────────
const balanceAdjustSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int(), // positive to add, negative to deduct
  reason: z.string().min(1).max(500),
});

router.post(
  "/balance-adjust",
  validate(balanceAdjustSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const { userId, amount, reason } = req.body;

      await db.transaction(async (tx) => {
        const [currentUser] = await tx
          .select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, userId));

        if (!currentUser) throw new AppError(404, "User not found");

        const newBalance = currentUser.balance + amount;
        if (newBalance < 0) throw new AppError(400, "Adjustment would result in negative balance");

        await tx
          .update(users)
          .set({ balance: newBalance, updatedAt: new Date() })
          .where(eq(users.id, userId));

        await tx.insert(transactions).values({
          userId,
          type: "admin_adjustment",
          amount,
          balanceAfter: newBalance,
          note: `Admin adjustment: ${reason}`,
        });
      });

      // Fetch updated user
      const [updated] = await db
        .select({ id: users.id, balance: users.balance })
        .from(users)
        .where(eq(users.id, userId));

      logger.info({ userId, amount, reason, admin: req.user!.id }, "Balance adjusted");
      res.json({ userId: updated!.id, newBalance: updated!.balance });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/admin/flags — Pending forum flags ──────────────────────────
router.get("/flags", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: forumFlags.id,
        postId: forumFlags.postId,
        commentId: forumFlags.commentId,
        reason: forumFlags.reason,
        resolved: forumFlags.resolved,
        createdAt: forumFlags.createdAt,
        reporterName: users.fullName,
        reporterEmail: users.email,
      })
      .from(forumFlags)
      .innerJoin(users, eq(forumFlags.reporterId, users.id))
      .where(eq(forumFlags.resolved, false))
      .orderBy(desc(forumFlags.createdAt));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/flags/:id/resolve — Resolve a flag ──────────────────
router.post("/flags/:id/resolve", async (req, res, next) => {
  try {
    const db = getDb();
    const flagId = parseInt(req.params.id!, 10);

    const [updated] = await db
      .update(forumFlags)
      .set({ resolved: true })
      .where(eq(forumFlags.id, flagId))
      .returning();

    if (!updated) throw new AppError(404, "Flag not found");
    res.json({ resolved: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/posts/:id — Delete forum post ─────────────────────
router.delete("/posts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);

    // Delete post (cascade deletes comments and flags)
    const [deleted] = await db
      .delete(forumPosts)
      .where(eq(forumPosts.id, postId))
      .returning();

    if (!deleted) throw new AppError(404, "Post not found");

    // Resolve any flags for this post
    await db
      .update(forumFlags)
      .set({ resolved: true })
      .where(eq(forumFlags.postId, postId));

    logger.info({ postId, admin: req.user!.id }, "Forum post deleted");
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/comments/:id — Delete forum comment ───────────────
router.delete("/comments/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const commentId = parseInt(req.params.id!, 10);

    const [deleted] = await db
      .delete(forumComments)
      .where(eq(forumComments.id, commentId))
      .returning();

    if (!deleted) throw new AppError(404, "Comment not found");

    // Resolve any flags for this comment
    await db
      .update(forumFlags)
      .set({ resolved: true })
      .where(eq(forumFlags.commentId, commentId));

    logger.info({ commentId, admin: req.user!.id }, "Forum comment deleted");
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/readings/:id/refund — Refund a reading ─────────────
router.post("/readings/:id/refund", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);

    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));
    if (!reading) throw new AppError(404, "Reading not found");
    if (reading.status !== "completed") throw new AppError(400, "Can only refund completed readings");
    if (reading.totalCharged === 0) throw new AppError(400, "Nothing to refund");

    const refundAmount = reading.totalCharged;
    const readerDebit = reading.readerEarned;

    await db.transaction(async (tx) => {
      // Mark reading as cancelled
      await tx
        .update(readings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(readings.id, readingId));

      // Credit client
      const [clientUpdated] = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} + ${refundAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, reading.clientId))
        .returning({ balance: users.balance });

      await tx.insert(transactions).values({
        userId: reading.clientId,
        readingId,
        type: "refund",
        amount: refundAmount,
        balanceAfter: clientUpdated?.balance ?? 0,
        note: `Refund for reading #${readingId}`,
      });

      // Debit reader
      const [readerUpdated] = await tx
        .update(users)
        .set({
          balance: sql`GREATEST(${users.balance} - ${readerDebit}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, reading.readerId))
        .returning({ balance: users.balance });

      await tx.insert(transactions).values({
        userId: reading.readerId,
        readingId,
        type: "refund",
        amount: -readerDebit,
        balanceAfter: readerUpdated?.balance ?? 0,
        note: `Refund debit for reading #${readingId}`,
      });
    });

    logger.info({ readingId, refundAmount, admin: req.user!.id }, "Reading refunded");
    res.json({ refunded: true, amount: refundAmount });
  } catch (err) {
    next(err);
  }
});

export default router;
