import { defineConfig } from "drizzle-kit";

<<<<<<< HEAD
export default {
  schema: "../shared/dist/schema.js",
=======
export default defineConfig({
  schema: "../shared/src/schema.ts",
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
});
