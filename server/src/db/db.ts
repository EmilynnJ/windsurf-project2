import pkg from "pg";
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@soulseer/shared/schema";
import { config } from "../config";
import { logger } from "../utils/logger";

// ─── Connection Pool ────────────────────────────────────────────────────────

let _pool: InstanceType<typeof Pool> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function ensurePool(): InstanceType<typeof Pool> {
  if (!_pool) {
    _pool = new Pool({
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    _pool.on("error", (err) => {
      logger.error({ err }, "Unexpected database pool error");
    });
  }
  return _pool;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get or create the Drizzle ORM instance with typed schema.
 */
export function getDb() {
  if (!_db) {
    const p = ensurePool();
    _db = drizzle(p, { schema });
  }
  return _db;
}

/**
 * Lazy-initialized singleton for direct import: `import { db } from '../db/db'`
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

/**
 * Get the raw pg Pool (for graceful shutdown).
 */
export function getPool(): InstanceType<typeof Pool> {
  return ensurePool();
}
