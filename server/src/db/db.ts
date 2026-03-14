import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import { config } from '../config';
import { logger } from '../utils/logger';

neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: config.database.url });
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

export const db = drizzle(pool, { schema });

/** Alias for `db` — used in route handlers for consistency */
export function getDb() {
  return db;
}

/** Get the raw pool for direct queries */
export function getPool() {
  return pool;
}
