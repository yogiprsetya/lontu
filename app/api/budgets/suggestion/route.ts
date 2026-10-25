import { badRequest } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { suggestBudgets } from "@/lib/budget-suggestion";
import { budgetSuggestionQuerySchema, monthRange, type BudgetSuggestion } from "@/lib/schemas/budget";
import { budgetHistory } from "@/lib/server/queries/budget-history";
import { transactionTotals } from "@/lib/server/queries/transaction-totals";
import { shiftPeriod } from "@/lib/transaction-filters";

/** Read-only: applying a suggestion goes through PUT /api/budgets. */
export const GET = withAuth(async (req, { userId }) => {
  const parsed = budgetSuggestionQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);
  const { period, income } = parsed.data;

  // The current month's income is still incomplete, so the default basis is last month's.
  const previous = shiftPeriod(period, -1);
  const [history, basis] = await Promise.all([
    budgetHistory(userId, period),
    income ?? (previous === period ? 0 : transactionTotals(userId, monthRange(previous)).then((t) => t.income)),
  ]);

  const body: BudgetSuggestion = {
    period,
    basis,
    basisSource: income === undefined ? "previous_month" : "input",
    ...suggestBudgets({ basis, ...history }),
  };
  return Response.json(body);
});
