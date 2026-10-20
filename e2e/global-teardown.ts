import "dotenv/config";
import postgres from "postgres";
import { E2E_USER } from "../lib/auth/providers";

export default async function globalTeardown() {
  if (!process.env.DATABASE_URL) return;
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    // Cascades to every row the E2E user created.
    await sql`delete from users where id = ${E2E_USER.id}`;
  } finally {
    await sql.end();
  }
}
