import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { badRequest, invalidJson, notFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { profileSchema } from "@/lib/schemas/profile";

const profileColumns = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  image: users.image,
  phone: users.phone,
  location: users.location,
  currency: users.currency,
};

export const GET = withAuth(async (_req, { userId }) => {
  const [row] = await db.select(profileColumns).from(users).where(eq(users.id, userId));
  if (!row) return notFound("USER_NOT_FOUND", "Profil tidak ditemukan");
  return Response.json(row);
});

export const PATCH = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const query =
    Object.keys(parsed.data).length === 0
      ? db.select(profileColumns).from(users).where(eq(users.id, userId))
      : db.update(users).set(parsed.data).where(eq(users.id, userId)).returning(profileColumns);
  const [row] = await query;
  if (!row) return notFound("USER_NOT_FOUND", "Profil tidak ditemukan");
  return Response.json(row);
});
