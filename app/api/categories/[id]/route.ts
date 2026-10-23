import { z } from "zod";
import { badRequest, categoryNameTaken, categoryNotFound, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { categoryRenameSchema } from "@/lib/schemas/category";
import { renameCategory, setCategoryArchived } from "@/lib/server/categories";
import { isUniqueViolation } from "@/lib/server/pg-errors";

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  if (!z.uuid().safeParse(params.id).success) return categoryNotFound();

  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = categoryRenameSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const category = await renameCategory(userId, params.id, parsed.data.name);
    return category ? Response.json(category) : categoryNotFound();
  } catch (err) {
    if (isUniqueViolation(err, "categories_user_kind_name_unique")) return categoryNameTaken();
    throw err;
  }
});

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  if (!z.uuid().safeParse(params.id).success) return categoryNotFound();
  const category = await setCategoryArchived(userId, params.id, true);
  return category ? Response.json(category) : categoryNotFound();
});
