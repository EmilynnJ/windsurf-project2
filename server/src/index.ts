import "dotenv/config";
import "./types"; // load type augmentations

import http from "http";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";

import { config } from "./config";
import { logger } from "./utils/logger";
import { getPool } from "./db/db";
import { generalLimiter } from "./middleware/rate-limit";
import { globalErrorHandler } from "./middleware/error-handler";
import { wsService } from "./services/websocket-service";
import { billingService } from "./services/billing-service";

// ─── Route imports ──────────────────────────────────────────────────────────
import authRoutes from "./routes/auth";
import readersRoutes from "./routes/readers";
import usersRoutes from "./routes/users";
import readingRoutes from "./routes/readings";
import paymentRoutes from "./routes/payments";
import forumRoutes from "./routes/forum";
import adminRoutes from "./routes/admin";

// ─── Express app ────────────────────────────────────────────────────────────

const app = express();

// ── Security headers ─────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);

// ── Request logging ──────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/api/health",
    },
  }),
);

// ── Global rate limit ────────────────────────────────────────────────────
app.use(generalLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────
// NOTE: Stripe webhook needs raw body for signature verification.
// We skip JSON parsing for that path.
app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook") {
    next();
  } else {
    express.json({ limit: "2mb" })(req, res, next);
  }
});
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

// ── Global error handler (must be last) ──────────────────────────────────
app.use(globalErrorHandler);

// ─── HTTP server + WebSocket ────────────────────────────────────────────────

const server = http.createServer(app);
wsService.attach(server);

// ─── Start ──────────────────────────────────────────────────────────────────

server.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv },
    `SoulSeer API server listening on port ${config.port}`,
  );
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received");

  billingService.shutdown();
  wsService.shutdown();

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
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection");
  shutdown("unhandledRejection");
});

export { app, server };
