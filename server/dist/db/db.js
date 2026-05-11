import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@soulseer/shared/schema";
let pool;
export function getPool() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is required");
    }
    if (!pool) {
        pool = new Pool({ connectionString: databaseUrl });
    }
    return pool;
}
export function getDb() {
    return drizzle(getPool(), { schema });
}
export const db = getDb();
