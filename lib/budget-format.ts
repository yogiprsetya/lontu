import { budgetStatus, type BudgetStatus } from "@/lib/budget-status";
import { parsePeriod } from "@/lib/period";
import { filtersToUrl } from "@/lib/transaction-filters";
import { archiveLabel } from "@/lib/archived";
import type { BudgetGroup, BudgetPeriod } from "@/lib/schemas/budget";
import type { BudgetUsageItem } from "@/lib/schemas/budget-usage";
import type { Category, SpendingType } from "@/lib/schemas/category";

/** `?period=` from the page URL; anything the API would reject falls back to the current month. */
export function budgetPeriodFromParam(value: string | null, today: string): BudgetPeriod {
  return parsePeriod(value, { modes: ["month"], today, max: today });
}

const STATUS_LABEL: Record<BudgetStatus, string | null> = {
  none: null,
  ok: null,
  warning: "Hampir habis",
  over: "Melebihi budget",
};

export function statusLabel(status: BudgetStatus) {
  return STATUS_LABEL[status];
}

/** A group's bar measures only the spending that has a budget; the rest is shown as "tanpa budget". */
export function groupStatus(group: BudgetGroup) {
  const budgetedSpent = group.spent - group.unbudgetedSpent;
  return { budgetedSpent, ...budgetStatus(group.budget > 0 ? group.budget : null, budgetedSpent) };
}

/** Same URL dashboard's Budget Summary links to. */
export function budgetTransactionsHref(period: BudgetPeriod, categoryId: string) {
  return `/transactions?${filtersToUrl({ period, type: "expense", categoryId })}`;
}

export type BudgetCategoryOption =
  | { id: string; name: string; status: "free" | "own" }
  | { id: string; name: string; status: "taken"; takenBy: string };

/**
 * The categories a budget of `spendingType` can pick this month, by name. `taken` ones belong to
 * another budget (the server rejects them); archived ones appear only when the budget has them.
 */
export function budgetCategoryOptions({
  categories,
  usage,
  budgetId,
  spendingType,
}: {
  categories: Category[];
  usage: {
    items: (Pick<BudgetUsageItem, "budgetId" | "name"> & {
      categories: { categoryId: string }[];
    })[];
  };
  budgetId?: string;
  spendingType: SpendingType;
}): BudgetCategoryOption[] {
  const owner = new Map(
    usage.items.flatMap((item) => item.categories.map((c) => [c.categoryId, item] as const)),
  );
  return categories
    .filter((c) => c.kind === "spending" && c.spendingType === spendingType)
    .flatMap((c): BudgetCategoryOption[] => {
      const by = owner.get(c.id);
      if (by && by.budgetId === budgetId)
        return [{ id: c.id, name: archiveLabel(c), status: "own" }];
      if (c.archivedAt) return [];
      return [
        by
          ? { id: c.id, name: c.name, status: "taken", takenBy: by.name }
          : { id: c.id, name: c.name, status: "free" },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));
}

type BudgetFields = { name: string; amount: number; categoryIds: string[] };

/** The fields an edit changed, so a PATCH never rewrites what the user left alone. */
export function budgetPatch(initial: BudgetFields, next: BudgetFields): Partial<BudgetFields> {
  const patch: Partial<BudgetFields> = {};
  if (next.name.trim() !== initial.name) patch.name = next.name;
  if (next.amount !== initial.amount) patch.amount = next.amount;
  const before = new Set(initial.categoryIds);
  if (next.categoryIds.length !== before.size || next.categoryIds.some((id) => !before.has(id)))
    patch.categoryIds = next.categoryIds;
  return patch;
}
