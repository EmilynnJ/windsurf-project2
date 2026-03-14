import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { users } from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  isOnline: z.boolean(),
});

const updatePricingSchema = z.object({
  pricingChat: z.number().int().nonnegative().optional(),
  pricingVoice: z.number().int().nonnegative().optional(),
  pricingVideo: z.number().int().nonnegative().optional(),
});

const updateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  specialties: z.string().max(500).optional(),
});

// ─── GET /api/readers ───────────────────────────────────────────────────────

router.get("/", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const readerList = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "reader"));

    return res.json({ readers: readerList });
  } catch (err) {
    logger.error({ err }, "Error fetching readers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/readers/online ────────────────────────────────────────────────

router.get("/online", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const onlineReaders = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.role, "reader"), eq(users.isOnline, true)));

    return res.json({ readers: onlineReaders });
  } catch (err) {
    logger.error({ err }, "Error fetching online readers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/readers/:id ───────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid reader ID" });

    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "reader")))
      .limit(1);

    if (!rows[0]) return res.status(404).json({ error: "Reader not found" });
    return res.json({ reader: rows[0] });
  } catch (err) {
    logger.error({ err }, "Error fetching reader");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/readers/status — Reader only ────────────────────────────────

router.patch("/status", ...requireAuth, requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const { isOnline } = updateStatusSchema.parse(req.body);
    const db = getDb();

    await db.update(users).set({ isOnline }).where(eq(users.id, req.user!.id));

    logger.info({ userId: req.user!.id, isOnline }, "Reader status updated");
    return res.json({ message: "Status updated", isOnline });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Error updating reader status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/readers/pricing — Reader only ──────────────────────────────

router.patch("/pricing", ...requireAuth, requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const body = updatePricingSchema.parse(req.body);
    const db = getDb();

    const updated = await db.update(users).set(body).where(eq(users.id, req.user!.id)).returning();

    logger.info({ userId: req.user!.id }, "Reader pricing updated");
    return res.json({
      pricingChat: updated[0]!.pricingChat,
      pricingVoice: updated[0]!.pricingVoice,
      pricingVideo: updated[0]!.pricingVideo,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Error updating reader pricing");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/readers/profile — Reader only ──────────────────────────────

router.patch("/profile", ...requireAuth, requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const db = getDb();

    const updated = await db.update(users).set(body).where(eq(users.id, req.user!.id)).returning();

    return res.json({ bio: updated[0]!.bio, specialties: updated[0]!.specialties });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Error updating reader profile");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
