import "dotenv/config";
import http from "http";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config";
import { logger } from "./utils/logger";
import { getPool } from "./db/db";
import { stopAllBillingTimers } from "./services/billing-service";
import { cleanupAllTimers } from "./services/reading-service";

// ─── Route imports ──────────────────────────────────────────────────────────
import authRoutes from "./routes/auth";
import readersRoutes from "./routes/readers";
import usersRoutes from "./routes/users";
import readingRoutes from "./routes/readings";
import paymentRoutes, { webhookRouter } from "./routes/payments";
import forumRoutes from "./routes/forum";
import adminRoutes from "./routes/admin";

// ─── Express app ────────────────────────────────────────────────────────────

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);

// ── Stripe webhook MUST come BEFORE express.json() — needs raw body ──────
app.use("/api/webhooks/stripe", webhookRouter);

// ── Body parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

// ── Health check ─────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/readers", readersRoutes);
app.use("/api/user", usersRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/admin", adminRoutes);

// ── 404 fallback ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── HTTP server ────────────────────────────────────────────────────────────

const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv },
    `SoulSeer API server listening on port ${config.port}`,
  );
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received");
  stopAllBillingTimers();
  cleanupAllTimers();

  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await getPool().end();
      logger.info("Database pool closed");
    } catch (err) {
      logger.error({ err }, "Error closing database pool");
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app, server };
