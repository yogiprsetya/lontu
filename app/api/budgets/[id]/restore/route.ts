import { budgetNotFound, budgetRestoreConflict } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { restoreBudget } from "@/lib/server/budgets";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const result = await restoreBudget(userId, params.id);
  if (!result) return budgetNotFound();
  if ("restoreConflict" in result) return budgetRestoreConflict();
  return Response.json(result);
});
