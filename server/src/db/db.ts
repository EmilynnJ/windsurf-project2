import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@soulseer/shared/schema";
import { config } from "../config";
import { logger } from "../utils/logger";

// Required for Node.js — provide a WebSocket implementation to the Neon driver
neonConfig.webSocketConstructor = ws;

let pool: Pool | undefined;
let dbInstance: NeonDatabase<typeof schema> | undefined;

function ensurePool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.database.url });
    pool.on("error", (err) => {
      logger.error({ err }, "Unexpected database pool error");
    });
  }
  return pool;
}

/**
 * Get the Drizzle ORM instance (lazily initialized).
 */
export function getDb(): NeonDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(ensurePool(), { schema });
  }
  return dbInstance;
}

/** Direct pool access for health checks or raw queries */
export function getPool(): Pool {
  return ensurePool();
}

/** Convenience alias */
export const db = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
