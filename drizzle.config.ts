import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  // The database is shared with other apps: touch only the lontu schema.
  schemaFilter: ["lontu"],
  // Not in lontu: drizzle-kit creates the migrations schema first, which would clash with
  // the init migration's CREATE SCHEMA "lontu".
  migrations: { schema: "drizzle", table: "lontu_migrations" },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
