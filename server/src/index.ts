import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { getPool } from "./db/db";

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

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
