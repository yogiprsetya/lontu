import { z } from "zod";
import { categoryNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { setCategoryArchived } from "@/lib/server/categories";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  if (!z.uuid().safeParse(params.id).success) return categoryNotFound();
  const category = await setCategoryArchived(userId, params.id, false);
  return category ? Response.json(category) : categoryNotFound();
});
