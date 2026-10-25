import { budgetNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { softDeleteBudget } from "@/lib/server/budgets";

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const budget = await softDeleteBudget(userId, params.id);
  return budget ? Response.json(budget) : budgetNotFound();
});
