import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? (() => { throw new Error('DATABASE_URL env var is required for drizzle-kit'); })(),
  },
  verbose: true,
  strict: true,
});
