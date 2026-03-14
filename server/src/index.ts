import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { getPool } from "./db/db";
import authRoutes from "./routes/auth";
import paymentRoutes from "./payment/payment-routes";
import userRoutes from "./routes/users";
import readerRoutes from "./routes/readers";
import balanceRoutes from "./routes/balance";
import profileImageRoutes from "./routes/profile-image";
import readingRoutes from "./routes/readings";
import messageRoutes from "./routes/messages";
import { GracePeriodService } from "./services/grace-period-service";

const app = express();

app.use(pinoHttp());
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/db-check", async (_req, res) => {
  const result = await getPool().query("select 1 as ok");
  res.json({ ok: result.rows[0]?.ok === 1 });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/readers", readerRoutes);
app.use("/api/balance", balanceRoutes);
app.use("/api/profile-image", profileImageRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/messages", messageRoutes);

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});

// Clean up grace period service on shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  GracePeriodService.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  GracePeriodService.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
