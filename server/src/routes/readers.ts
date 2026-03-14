import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/db";
import { users } from "@soulseer/shared/schema";
import { checkJwt } from "../middleware/auth";
import { resolveUser, requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { logger } from "../utils/logger";
import { AppError } from "../middleware/error-handler";

const router = Router();

// ─── Public reader fields (never expose balance, stripe IDs, etc.) ──────────

const publicReaderSelect = {
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
} as const;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const updatePricingSchema = z.object({
  pricingChat: z.number().int().nonnegative().optional(),
  pricingVoice: z.number().int().nonnegative().optional(),
  pricingVideo: z.number().int().nonnegative().optional(),
});

const updateProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
  profileImage: z.string().url().optional(),
});

const updateStatusSchema = z.object({
  isOnline: z.boolean(),
});

// ─── GET /api/readers — Public. All reader profiles ─────────────────────────

router.get("/", async (_req: Request, res: Response) => {
  try {
    const readers = await db
      .select(publicReaderSelect)
      .from(users)
      .where(eq(users.role, "reader"))
      .orderBy(desc(users.isOnline), users.fullName);

    return res.json({ readers });
  } catch (err) {
    logger.error({ err }, "Error fetching readers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/readers/online — Public. Online readers only ──────────────────

router.get("/online", async (_req: Request, res: Response) => {
  try {
    const readers = await db
      .select(publicReaderSelect)
      .from(users)
      .where(and(eq(users.role, "reader"), eq(users.isOnline, true)))
      .orderBy(users.fullName);

    return res.json({ readers });
  } catch (err) {
    logger.error({ err }, "Error fetching online readers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/readers/:id — Public. Single reader profile ───────────────────

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid reader ID" });
    }

    const [reader] = await db
      .select(publicReaderSelect)
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "reader")))
      .limit(1);

    if (!reader) {
      return res.status(404).json({ error: "Reader not found" });
    }

    return res.json({ reader });
  } catch (err) {
    logger.error({ err }, "Error fetching reader");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/readers/status — Reader only. Toggle online/offline ─────────

router.patch(
  "/status",
  checkJwt,
  resolveUser,
  requireRole("reader"),
  validate(updateStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const [updated] = await db
        .update(users)
        .set({ isOnline: req.body.isOnline })
        .where(eq(users.id, req.user!.id))
        .returning({ id: users.id, isOnline: users.isOnline });

      logger.info({ readerId: req.user!.id, isOnline: req.body.isOnline }, "Reader status updated");
      return res.json({ reader: updated });
    } catch (err) {
      logger.error({ err }, "Error updating reader status");
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─── PATCH /api/readers/pricing — Reader only. Update per-type rates ────────

router.patch(
  "/pricing",
  checkJwt,
  resolveUser,
  requireRole("reader"),
  validate(updatePricingSchema),
  async (req: Request, res: Response) => {
    try {
      const fields: Record<string, number> = {};
      if (req.body.pricingChat !== undefined) fields.pricingChat = req.body.pricingChat;
      if (req.body.pricingVoice !== undefined) fields.pricingVoice = req.body.pricingVoice;
      if (req.body.pricingVideo !== undefined) fields.pricingVideo = req.body.pricingVideo;

      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: "At least one pricing field required" });
      }

      const [updated] = await db
        .update(users)
        .set(fields)
        .where(eq(users.id, req.user!.id))
        .returning({
          id: users.id,
          pricingChat: users.pricingChat,
          pricingVoice: users.pricingVoice,
          pricingVideo: users.pricingVideo,
        });

      logger.info({ readerId: req.user!.id, ...fields }, "Reader pricing updated");
      return res.json({ reader: updated });
    } catch (err) {
      logger.error({ err }, "Error updating reader pricing");
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─── PATCH /api/readers/profile — Reader only. Update bio/specialties ───────

router.patch(
  "/profile",
  checkJwt,
  resolveUser,
  requireRole("reader"),
  validate(updateProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const fields: Record<string, string | undefined> = {};
      if (req.body.bio !== undefined) fields.bio = req.body.bio;
      if (req.body.specialties !== undefined) fields.specialties = req.body.specialties;
      if (req.body.profileImage !== undefined) fields.profileImage = req.body.profileImage;

      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: "At least one profile field required" });
      }

      const [updated] = await db
        .update(users)
        .set(fields)
        .where(eq(users.id, req.user!.id))
        .returning({
          id: users.id,
          bio: users.bio,
          specialties: users.specialties,
          profileImage: users.profileImage,
        });

      logger.info({ readerId: req.user!.id }, "Reader profile updated");
      return res.json({ reader: updated });
    } catch (err) {
      logger.error({ err }, "Error updating reader profile");
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
