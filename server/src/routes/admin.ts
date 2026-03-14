import { Router } from "express";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";
import { getDb } from "../db/db";
import { users, readings, transactions, forumPosts, forumComments, forumFlags } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { config } from "../config";
import { logger } from "../utils/logger";

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, { apiVersion: "2024-06-20" as any });

router.use(requireAuth);
router.use(requireRole("admin"));

// ─── Dashboard stats ────────────────────────────────────────────────────────
router.get("/stats", async (_req, res, next) => {
  try {
    const db = getDb();
    const [userCount] = await db.select({ count: count() }).from(users);
    const [readingCount] = await db.select({ count: count() }).from(readings);
    const [activeCount] = await db.select({ count: count() }).from(readings).where(eq(readings.status, "active"));
    const [revenue] = await db.select({ total: sql<number>`COALESCE(SUM(${readings.platformEarned}), 0)` }).from(readings).where(eq(readings.status, "completed"));
    res.json({
      totalUsers: Number(userCount?.count ?? 0),
      totalReadings: Number(readingCount?.count ?? 0),
      activeReadings: Number(activeCount?.count ?? 0),
      totalRevenue: Number(revenue?.total ?? 0),
    });
  } catch (err) { next(err); }
});

// ─── List users ─────────────────────────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const db = getDb();
    const role = req.query.role as string | undefined;
    let q = db.select().from(users).orderBy(desc(users.createdAt)).limit(100).$dynamic();
    if (role === "reader" || role === "client" || role === "admin") q = q.where(eq(users.role, role));
    res.json(await q);
  } catch (err) { next(err); }
});

// ─── Create reader ──────────────────────────────────────────────────────────
const createReaderSchema = z.object({
  auth0Id: z.string().min(1), email: z.string().email(), fullName: z.string().min(1),
  bio: z.string().optional(), specialties: z.string().optional(),
  pricingChat: z.number().int().min(0).default(0), pricingVoice: z.number().int().min(0).default(0), pricingVideo: z.number().int().min(0).default(0),
});

router.post("/readers", validateBody(createReaderSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;
    const [existing] = await db.select().from(users).where(eq(users.auth0Id, body.auth0Id));
    if (existing) { res.status(409).json({ error: "User already exists" }); return; }

    // Create Stripe Connect account for reader
    const account = await stripe.accounts.create({
      type: "express", email: body.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });

    const [reader] = await db.insert(users).values({
      auth0Id: body.auth0Id, email: body.email, fullName: body.fullName, role: "reader",
      bio: body.bio ?? null, specialties: body.specialties ?? null,
      pricingChat: body.pricingChat, pricingVoice: body.pricingVoice, pricingVideo: body.pricingVideo,
      stripeAccountId: account.id,
    }).returning();

    const accountLink = await stripe.accountLinks.create({
      account: account.id, refresh_url: `${config.corsOrigin}/dashboard`, return_url: `${config.corsOrigin}/dashboard`, type: "account_onboarding",
    });

    logger.info({ readerId: reader!.id, email: body.email }, "Reader created by admin");
    res.status(201).json({ reader, stripeOnboardingUrl: accountLink.url });
  } catch (err) { next(err); }
});

// ─── Update user role ───────────────────────────────────────────────────────
router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const db = getDb();
    const userId = parseInt(req.params.id!, 10);
    const role = req.body.role;
    if (!["client", "reader", "admin"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
    const [u] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    if (!u) { res.status(404).json({ error: "User not found" }); return; }
    res.json(u);
  } catch (err) { next(err); }
});

// ─── Adjust balance ─────────────────────────────────────────────────────────
const adjustSchema = z.object({ amount: z.number().int(), note: z.string().min(1) });
router.post("/users/:id/adjust-balance", validateBody(adjustSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const userId = parseInt(req.params.id!, 10);
    const { amount, note } = req.body;
    await db.transaction(async (tx) => {
      const [u] = await tx.update(users).set({ balance: sql`${users.balance} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ balance: users.balance });
      if (!u) throw new Error("User not found");
      await tx.insert(transactions).values({ userId, type: "admin_adjustment", amount, balanceAfter: u.balance, note });
    });
    logger.info({ userId, amount, note, adminId: req.user!.id }, "Admin balance adjustment");
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── Refund reading ─────────────────────────────────────────────────────────
router.post("/readings/:id/refund", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);
    const [reading] = await db.select().from(readings).where(and(eq(readings.id, readingId), eq(readings.status, "completed")));
    if (!reading) { res.status(404).json({ error: "Completed reading not found" }); return; }
    if (reading.totalCharged === 0) { res.status(400).json({ error: "Nothing to refund" }); return; }
    const amount = reading.totalCharged;
    await db.transaction(async (tx) => {
      const [u] = await tx.update(users).set({ balance: sql`${users.balance} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, reading.clientId)).returning({ balance: users.balance });
      await tx.insert(transactions).values({ userId: reading.clientId, readingId, type: "refund", amount, balanceAfter: u!.balance, note: `Admin refund for reading #${readingId}` });
    });
    logger.info({ readingId, amount, adminId: req.user!.id }, "Reading refunded by admin");
    res.json({ ok: true, amount });
  } catch (err) { next(err); }
});

// ─── Moderation ─────────────────────────────────────────────────────────────
router.get("/flags", async (_req, res, next) => {
  try {
    const db = getDb();
    const flags = await db.select().from(forumFlags).where(eq(forumFlags.resolved, false)).orderBy(desc(forumFlags.createdAt)).limit(50);
    res.json(flags);
  } catch (err) { next(err); }
});

router.patch("/flags/:id/resolve", async (req, res, next) => {
  try {
    const db = getDb();
    const flagId = parseInt(req.params.id!, 10);
    const [f] = await db.update(forumFlags).set({ resolved: true }).where(eq(forumFlags.id, flagId)).returning();
    if (!f) { res.status(404).json({ error: "Flag not found" }); return; }
    res.json(f);
  } catch (err) { next(err); }
});

router.delete("/posts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    await db.delete(forumPosts).where(eq(forumPosts.id, postId));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch("/posts/:id/lock", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    const isLocked = req.body.isLocked !== false;
    const [p] = await db.update(forumPosts).set({ isLocked, updatedAt: new Date() }).where(eq(forumPosts.id, postId)).returning();
    if (!p) { res.status(404).json({ error: "Post not found" }); return; }
    res.json(p);
  } catch (err) { next(err); }
});

export default router;
