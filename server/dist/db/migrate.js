import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, getPool } from "./db";
await migrate(getDb(), { migrationsFolder: "./drizzle" });
await getPool().end();
