import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, desc, isNull } from "drizzle-orm";
import {
  users,
  readings,
  transactions,
  forumFlags,
} from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { logger } from "../utils/logger";
import { createConnectAccount, triggerPayout } from "../services/stripe-service";

const router = Router();

// All admin routes require auth + admin role
router.use(...requireAuth, requireRole("admin"));

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createReaderSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(50),
  fullName: z.string().min(1).max(255),
  bio: z.string().max(1000).optional(),
  specialties: z.string().max(500).optional(),
  pricingChat: z.number().int().nonnegative().optional().default(0),
  pricingVoice: z.number().int().nonnegative().optional().default(0),
  pricingVideo: z.number().int().nonnegative().optional().default(0),
  profileImage: z.string().url().optional(),
});

const editReaderSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  specialties: z.string().max(500).optional(),
  pricingChat: z.number().int().nonnegative().optional(),
  pricingVoice: z.number().int().nonnegative().optional(),
  pricingVideo: z.number().int().nonnegative().optional(),
  profileImage: z.string().url().optional(),
  isOnline: z.boolean().optional(),
});

const balanceAdjustSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
});

const payoutSchema = z.object({
  amount: z.number().int().positive("Payout amount must be positive"),
});

// ─── GET /api/admin/users ───────────────────────────────────────────────────

router.get("/users", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        accountBalance: users.accountBalance,
        isOnline: users.isOnline,
        stripeAccountId: users.stripeAccountId,
        stripeCustomerId: users.stripeCustomerId,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return res.json({ users: allUsers });
  } catch (err) {
    logger.error({ err }, "Admin: error listing users");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/readers ────────────────────────────────────────────────

router.post("/readers", async (req: Request, res: Response) => {
  try {
    const body = createReaderSchema.parse(req.body);
    const db = getDb();

    const emailRows = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (emailRows[0]) return res.status(409).json({ error: "Email already in use" });

    const usernameRows = await db.select({ id: users.id }).from(users).where(eq(users.username, body.username)).limit(1);
    if (usernameRows[0]) return res.status(409).json({ error: "Username already in use" });

    const inserted = await db
      .insert(users)
      .values({
        auth0Id: `pending_${Date.now()}`,
        email: body.email,
        username: body.username,
        fullName: body.fullName,
        role: "reader",
        bio: body.bio,
        specialties: body.specialties,
        pricingChat: body.pricingChat,
        pricingVoice: body.pricingVoice,
        pricingVideo: body.pricingVideo,
        profileImage: body.profileImage,
      })
      .returning();

    logger.info({ readerId: inserted[0]!.id }, "Admin created reader account");
    return res.status(201).json(inserted[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Admin: error creating reader");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/readers/:id ───────────────────────────────────────────

router.patch("/readers/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid reader ID" });

    const body = editReaderSchema.parse(req.body);
    const db = getDb();

    const existingRows = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
    if (!existingRows[0]) return res.status(404).json({ error: "Reader not found" });
    if (existingRows[0].role !== "reader") return res.status(400).json({ error: "User is not a reader" });

    const updated = await db.update(users).set(body).where(eq(users.id, id)).returning();
    return res.json(updated[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Admin: error editing reader");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/readings ────────────────────────────────────────────────

router.get("/readings", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const allReadings = await db.select().from(readings).orderBy(desc(readings.createdAt));
    return res.json({ readings: allReadings });
  } catch (err) {
    logger.error({ err }, "Admin: error listing readings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/transactions ────────────────────────────────────────────

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const allTx = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ transactions: allTx, limit, offset });
  } catch (err) {
    logger.error({ err }, "Admin: error listing transactions");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/balance-adjust ─────────────────────────────────────────

router.post("/balance-adjust", async (req: Request, res: Response) => {
  try {
    const { userId, amount, reason } = balanceAdjustSchema.parse(req.body);
    const db = getDb();

    await db.transaction(async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
      const userRows = await tx
        .select({ accountBalance: users.accountBalance })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const user = userRows[0];
      if (!user) throw new Error("User not found");

      const balanceBefore = user.accountBalance;
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) throw new Error("Adjustment would result in negative balance");

      await tx.update(users).set({ accountBalance: balanceAfter }).where(eq(users.id, userId));

      await tx.insert(transactions).values({
        userId,
        type: "adjustment",
        amount,
        balanceBefore,
        balanceAfter,
        note: `Admin adjustment: ${reason} (by admin ${req.user!.id})`,
      });
    });

    logger.info({ userId, amount, reason, adminId: req.user!.id }, "Admin balance adjustment");
    return res.json({ message: "Balance adjusted successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("negative balance")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Admin: error adjusting balance");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/payouts/:readerId ──────────────────────────────────────

router.post("/payouts/:readerId", async (req: Request, res: Response) => {
  try {
    const readerId = Number(req.params.readerId);
    if (isNaN(readerId)) return res.status(400).json({ error: "Invalid reader ID" });

    const { amount } = payoutSchema.parse(req.body);
    const result = await triggerPayout(readerId, amount);

    logger.info({ readerId, amount, adminId: req.user!.id }, "Admin triggered payout");
    return res.json({ message: "Payout initiated", transferId: result.transferId });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("no Stripe") || msg.includes("Insufficient")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Admin: error triggering payout");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/forum/flagged ───────────────────────────────────────────

router.get("/forum/flagged", async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const flags = await db
      .select({
        id: forumFlags.id,
        postId: forumFlags.postId,
        commentId: forumFlags.commentId,
        reporterId: forumFlags.reporterId,
        reason: forumFlags.reason,
        reviewedAt: forumFlags.reviewedAt,
      })
      .from(forumFlags)
      .where(isNull(forumFlags.reviewedAt))
      .orderBy(desc(forumFlags.id));

    return res.json({ flags });
  } catch (err) {
    logger.error({ err }, "Admin: error listing flagged content");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
