import { budgetNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { restoreBudget } from "@/lib/server/budgets";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const budget = await restoreBudget(userId, params.id);
  return budget ? Response.json(budget) : budgetNotFound();
});
