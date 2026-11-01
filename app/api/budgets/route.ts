import { badRequest, budgetNameTaken, fieldError, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { budgetCreateSchema } from "@/lib/schemas/budget";
import { createBudget } from "@/lib/server/budgets";

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = budgetCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await createBudget(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("nameTaken" in result) return budgetNameTaken();
  return Response.json(result, { status: 201 });
});
