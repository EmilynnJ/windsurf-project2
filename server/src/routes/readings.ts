import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { logger } from "../utils/logger";
import {
  createReading,
  acceptReading,
  getAgoraToken,
  startReading,
  endReading,
  rateReading,
  getClientReadings,
  getReaderReadings,
  getReadingById,
} from "../services/reading-service";

const router = Router();

// All reading routes require authentication
router.use(...requireAuth);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createReadingSchema = z.object({
  readerId: z.number().int().positive(),
  type: z.enum(["chat", "voice", "video"]),
});

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});

// ─── POST /api/readings/on-demand — Client only ─────────────────────────────

router.post("/on-demand", requireRole("client"), async (req: Request, res: Response) => {
  try {
    const body = createReadingSchema.parse(req.body);
    const reading = await createReading({
      readerId: body.readerId,
      clientId: req.user!.id,
      type: body.type,
    });
    return res.status(201).json({ reading });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("not online") || msg.includes("Insufficient") || msg.includes("not a reader") || msg.includes("not offer")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Error creating reading");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/readings/:id/accept — Reader only ───────────────────────────

router.post("/:id/accept", requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const readingId = Number(req.params.id);
    if (isNaN(readingId)) return res.status(400).json({ error: "Invalid reading ID" });

    const reading = await acceptReading(readingId, req.user!.id);
    return res.json({ reading });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("Only the assigned") || msg.includes("not pending")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Error accepting reading");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/readings/:id/agora-token — Participant only ─────────────────

router.post("/:id/agora-token", async (req: Request, res: Response) => {
  try {
    const readingId = Number(req.params.id);
    if (isNaN(readingId)) return res.status(400).json({ error: "Invalid reading ID" });

    const tokens = await getAgoraToken(readingId, req.user!.id);
    return res.json({ tokens });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("Not a participant") || msg.includes("not configured")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Error generating Agora token");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/readings/:id/start — Participant only ───────────────────────

router.post("/:id/start", async (req: Request, res: Response) => {
  try {
    const readingId = Number(req.params.id);
    if (isNaN(readingId)) return res.status(400).json({ error: "Invalid reading ID" });

    const reading = await startReading(readingId, req.user!.id);
    return res.json({ reading });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("Not a participant") || msg.includes("must be accepted")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Error starting reading");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/readings/:id/end — Participant only ─────────────────────────

router.post("/:id/end", async (req: Request, res: Response) => {
  try {
    const readingId = Number(req.params.id);
    if (isNaN(readingId)) return res.status(400).json({ error: "Invalid reading ID" });

    const reading = await endReading(readingId, req.user!.id);
    return res.json({ reading });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("Not a participant") || msg.includes("not in progress")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Error ending reading");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/readings/:id/rate — Client only ─────────────────────────────

router.post("/:id/rate", requireRole("client"), async (req: Request, res: Response) => {
  try {
    const readingId = Number(req.params.id);
    if (isNaN(readingId)) return res.status(400).json({ error: "Invalid reading ID" });

    const body = rateSchema.parse(req.body);
    const reading = await rateReading(readingId, req.user!.id, body.rating, body.review);
    return res.json({ reading });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    const msg = (err as Error).message;
    if (msg.includes("not found") || msg.includes("Only the client") || msg.includes("completed") || msg.includes("Already rated")) {
      return res.status(400).json({ error: msg });
    }
    logger.error({ err }, "Error rating reading");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/readings/client — Client history ──────────────────────────────

router.get("/client", requireRole("client"), async (req: Request, res: Response) => {
  try {
    const readingList = await getClientReadings(req.user!.id);
    return res.json({ readings: readingList });
  } catch (err) {
    logger.error({ err }, "Error fetching client readings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/readings/reader — Reader history ──────────────────────────────

router.get("/reader", requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const readingList = await getReaderReadings(req.user!.id);
    return res.json({ readings: readingList });
  } catch (err) {
    logger.error({ err }, "Error fetching reader readings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/readings/:id — Participant only ──────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const readingId = Number(req.params.id);
    if (isNaN(readingId)) return res.status(400).json({ error: "Invalid reading ID" });

    const reading = await getReadingById(readingId);
    if (!reading) return res.status(404).json({ error: "Reading not found" });

    // Only participants or admin can view
    if (
      req.user!.id !== reading.clientId &&
      req.user!.id !== reading.readerId &&
      req.user!.role !== "admin"
    ) {
      return res.status(403).json({ error: "Not a participant" });
    }

    return res.json({ reading });
  } catch (err) {
    logger.error({ err }, "Error fetching reading");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
