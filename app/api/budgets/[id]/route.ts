import {
  badRequest,
  budgetNameTaken,
  budgetNotFound,
  fieldError,
  invalidJson,
} from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { budgetUpdateSchema } from "@/lib/schemas/budget";
import { softDeleteBudget, updateBudget } from "@/lib/server/budgets";

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = budgetUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await updateBudget(userId, params.id, parsed.data);
  if (!result) return budgetNotFound();
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("nameTaken" in result) return budgetNameTaken();
  return Response.json(result);
});

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const budget = await softDeleteBudget(userId, params.id);
  return budget ? Response.json(budget) : budgetNotFound();
});
