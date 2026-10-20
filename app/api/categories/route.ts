import { badRequest, categoryNameTaken, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { categoryCreateSchema } from "@/lib/schemas/category";
import { createCategory, listCategories } from "@/lib/server/categories";

export const GET = withAuth(async (req, { userId }) => {
  const includeArchived = new URL(req.url).searchParams.get("include") === "archived";
  return Response.json(await listCategories(userId, { includeArchived }));
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const category = await createCategory(userId, parsed.data);
  if (!category) return categoryNameTaken();
  return Response.json(category, { status: 201 });
});
