import "server-only";
import { db } from "@/db";
import { users } from "@/db/schema";
import { seedDefaultCategories } from "@/lib/server/categories";

type GoogleIdentity = { id: string; email: string; name?: string | null; image?: string | null };

export async function upsertUser({ id, email, name, image }: GoogleIdentity) {
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ id, email, displayName: name ?? null, image: image ?? null })
      // display_name is user-editable in the app, so later Google logins must not overwrite it.
      .onConflictDoUpdate({ target: users.id, set: { email, image: image ?? null } });
    await seedDefaultCategories(tx, id);
  });
}
