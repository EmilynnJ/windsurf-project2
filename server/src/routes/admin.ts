import { Router } from "express";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";
import { getDb } from "../db/db";
import {
  users,
  readings,
  transactions,
  forumPosts,
  forumComments,
  forumFlags,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { config } from "../config";
import { logger } from "../utils/logger";

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2024-06-20" as any,
});

router.use(requireAuth);
router.use(requireRole("admin"));

// ─── GET /api/admin/stats — Dashboard stats ─────────────────────────────────
router.get("/stats", async (_req, res, next) => {
  try {
    const db = getDb();
    const [userCount] = await db.select({ count: count() }).from(users);
    const [readingCount] = await db.select({ count: count() }).from(readings);
    const [activeCount] = await db
      .select({ count: count() })
      .from(readings)
      .where(eq(readings.status, "active"));
    const [revenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${readings.platformEarned}), 0)`,
      })
      .from(readings)
      .where(eq(readings.status, "completed"));
    res.json({
      totalUsers: Number(userCount?.count ?? 0),
      totalReadings: Number(readingCount?.count ?? 0),
      activeReadings: Number(activeCount?.count ?? 0),
      totalRevenue: Number(revenue?.total ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/users — All users ────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const db = getDb();
    const role = req.query.role as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    let q = db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    if (role === "reader" || role === "client" || role === "admin") {
      q = q.where(eq(users.role, role));
    }

    res.json(await q);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/readers — Create reader account ─────────────────────────
const createReaderSchema = z.object({
  auth0Id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
  pricingChat: z.number().int().min(0).default(0),
  pricingVoice: z.number().int().min(0).default(0),
  pricingVideo: z.number().int().min(0).default(0),
});

router.post("/readers", validateBody(createReaderSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.auth0Id, body.auth0Id));
    if (existing) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    // Create Stripe Connect Express account for reader
    const account = await stripe.accounts.create({
      type: "express",
      email: body.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const [reader] = await db
      .insert(users)
      .values({
        auth0Id: body.auth0Id,
        email: body.email,
        fullName: body.fullName,
        username: body.username ?? null,
        role: "reader",
        bio: body.bio ?? null,
        specialties: body.specialties ?? null,
        pricingChat: body.pricingChat,
        pricingVoice: body.pricingVoice,
        pricingVideo: body.pricingVideo,
        stripeAccountId: account.id,
      })
      .returning();

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${config.corsOrigin}/dashboard`,
      return_url: `${config.corsOrigin}/dashboard`,
      type: "account_onboarding",
    });

    logger.info(
      { readerId: reader!.id, email: body.email, adminId: req.user!.id },
      "Reader created by admin",
    );

    res.status(201).json({ reader, stripeOnboardingUrl: accountLink.url });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/admin/readers/:id — Edit reader profile ─────────────────────
const editReaderSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
  profileImage: z.string().url().max(512).optional(),
  pricingChat: z.number().int().min(0).max(100_000).optional(),
  pricingVoice: z.number().int().min(0).max(100_000).optional(),
  pricingVideo: z.number().int().min(0).max(100_000).optional(),
});

router.patch(
  "/readers/:id",
  validateBody(editReaderSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const readerId = parseInt(req.params.id!, 10);

      if (isNaN(readerId)) {
        res.status(400).json({ error: "Invalid reader ID" });
        return;
      }

      // Verify reader exists
      const [reader] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, readerId), eq(users.role, "reader")));

      if (!reader) {
        res.status(404).json({ error: "Reader not found" });
        return;
      }

      const updates: Record<string, any> = {};
      const allowedFields = [
        "fullName",
        "username",
        "bio",
        "specialties",
        "profileImage",
        "pricingChat",
        "pricingVoice",
        "pricingVideo",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      updates.updatedAt = new Date();

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, readerId))
        .returning();

      logger.info(
        { readerId, adminId: req.user!.id, fields: Object.keys(updates) },
        "Reader updated by admin",
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/admin/users/:id/role — Update user role ─────────────────────
router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const db = getDb();
    const userId = parseInt(req.params.id!, 10);
    const role = req.body.role;

    if (!["client", "reader", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const [u] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!u) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(u);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/balance-adjust — Manual balance adjustment ──────────────
const adjustSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int(),
  note: z.string().min(1).max(500),
});

router.post("/balance-adjust", validateBody(adjustSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const { userId, amount, note } = req.body;

    await db.transaction(async (tx) => {
      const [before] = await tx
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, userId));

      if (!before) throw new Error("User not found");

      const balanceBefore = before.balance;

      const [u] = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ balance: users.balance });

      if (!u) throw new Error("User not found");

      await tx.insert(transactions).values({
        userId,
        type: "admin_adjustment",
        amount,
        balanceBefore,
        balanceAfter: u.balance,
        note,
      });
    });

    logger.info(
      { userId, amount, note, adminId: req.user!.id },
      "Admin balance adjustment",
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/readings — All readings platform-wide ───────────────────
router.get("/readings", async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    let q = db
      .select()
      .from(readings)
      .orderBy(desc(readings.createdAt))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    if (status) {
      q = q.where(eq(readings.status, status as any));
    }

    res.json(await q);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/transactions — Full transaction ledger ──────────────────
router.get("/transactions", async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const list = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/payouts/:readerId — Trigger reader payout ──────────────
router.post("/payouts/:readerId", async (req, res, next) => {
  try {
    const db = getDb();
    const readerId = parseInt(req.params.readerId!, 10);

    if (isNaN(readerId)) {
      res.status(400).json({ error: "Invalid reader ID" });
      return;
    }

    const [reader] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, readerId), eq(users.role, "reader")));

    if (!reader) {
      res.status(404).json({ error: "Reader not found" });
      return;
    }

    if (!reader.stripeAccountId) {
      res.status(400).json({ error: "No Stripe Connect account" });
      return;
    }

    if (reader.balance < 1500) {
      res.status(400).json({ error: "Minimum payout balance is $15.00" });
      return;
    }

    const amount = reader.balance;
    const balanceBefore = reader.balance;

    // CRITICAL: Do the Stripe transfer FIRST, before zeroing balance.
    // If Stripe fails, the reader's balance remains untouched.
    let transfer: any;
    try {
      transfer = await stripe.transfers.create({
        amount,
        currency: "usd",
        destination: reader.stripeAccountId,
        metadata: { readerId: String(readerId), adminId: String(req.user!.id) },
      });
    } catch (stripeErr) {
      logger.error(
        { readerId, amount, err: stripeErr },
        "Stripe transfer failed -- reader balance NOT zeroed",
      );
      res.status(502).json({ error: "Stripe transfer failed. Reader balance unchanged." });
      return;
    }

    // Stripe succeeded -- now zero the balance with optimistic lock
    const result = await db
      .update(users)
      .set({ balance: 0, updatedAt: new Date() })
      .where(
        sql`${users.id} = ${readerId} AND ${users.balance} = ${amount}`,
      )
      .returning({ id: users.id });

    if (!result.length) {
      // Balance changed between check and update -- log for manual reconciliation
      logger.error(
        { readerId, amount, transferId: transfer.id },
        "Balance changed after Stripe transfer -- needs manual reconciliation",
      );
      res.status(409).json({ error: "Balance changed during payout. Stripe transfer succeeded -- manual reconciliation needed." });
      return;
    }

    await db.insert(transactions).values({
      userId: readerId,
      type: "reader_payout",
      amount: -amount,
      balanceBefore,
      balanceAfter: 0,
      stripePaymentIntentId: transfer.id,
      note: `Payout $${(amount / 100).toFixed(2)} by admin`,
    });

    logger.info(
      { readerId, amount, transferId: transfer.id, adminId: req.user!.id },
      "Reader payout processed by admin",
    );

    res.json({ transferId: transfer.id, amount });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/readings/:id/refund — Refund a reading ────────────────
router.post("/readings/:id/refund", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);

    const [reading] = await db
      .select()
      .from(readings)
      .where(and(eq(readings.id, readingId), eq(readings.status, "completed")));

    if (!reading) {
      res.status(404).json({ error: "Completed reading not found" });
      return;
    }

    if (reading.totalCharged === 0) {
      res.status(400).json({ error: "Nothing to refund" });
      return;
    }

    const amount = reading.totalCharged;

    await db.transaction(async (tx) => {
      const [before] = await tx
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, reading.clientId));
      const balanceBefore = before?.balance ?? 0;

      const [u] = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, reading.clientId))
        .returning({ balance: users.balance });

      await tx.insert(transactions).values({
        userId: reading.clientId,
        readingId,
        type: "refund",
        amount,
        balanceBefore,
        balanceAfter: u!.balance,
        note: `Admin refund for reading #${readingId}`,
      });

      // Update payment status
      await tx
        .update(readings)
        .set({ paymentStatus: "refunded", updatedAt: new Date() })
        .where(eq(readings.id, readingId));
    });

    logger.info(
      { readingId, amount, adminId: req.user!.id },
      "Reading refunded by admin",
    );

    res.json({ ok: true, amount });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/forum/flagged — Flagged content queue ───────────────────
router.get("/forum/flagged", async (_req, res, next) => {
  try {
    const db = getDb();
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

// ─── PATCH /api/admin/flags/:id/resolve — Resolve a flag ────────────────────
router.patch("/flags/:id/resolve", async (req, res, next) => {
  try {
    const db = getDb();
    const flagId = parseInt(req.params.id!, 10);

    const [f] = await db
      .update(forumFlags)
      .set({ resolved: true })
      .where(eq(forumFlags.id, flagId))
      .returning();

    if (!f) {
      res.status(404).json({ error: "Flag not found" });
      return;
    }

    res.json(f);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/posts/:id — Delete forum post ────────────────────────
router.delete("/posts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    await db.delete(forumPosts).where(eq(forumPosts.id, postId));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/comments/:id — Delete forum comment ──────────────────
router.delete("/comments/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const commentId = parseInt(req.params.id!, 10);
    await db.delete(forumComments).where(eq(forumComments.id, commentId));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/admin/posts/:id/lock — Lock/unlock forum post ───────────────
router.patch("/posts/:id/lock", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    const isLocked = req.body.isLocked !== false;

    const [p] = await db
      .update(forumPosts)
      .set({ isLocked, updatedAt: new Date() })
      .where(eq(forumPosts.id, postId))
      .returning();

    if (!p) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(p);
  } catch (err) {
    next(err);
  }
});

export default router;
