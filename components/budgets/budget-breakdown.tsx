import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { budgetTransactionsHref } from "@/lib/budget-format";
import type { BudgetPeriod } from "@/lib/schemas/budget";
import type { BudgetUsageItem } from "@/lib/schemas/budget-usage";

type Props = { period: BudgetPeriod; item: BudgetUsageItem; names: Map<string, string> };

/** One row per category; each opens the month's expenses of that category, which sum to its figure. */
export function BudgetBreakdown({ period, item, names }: Props) {
  const money = useAmountFormat();

  return (
    <section aria-labelledby="budget-breakdown-title" className="flex flex-col gap-1">
      <h3 id="budget-breakdown-title" className="text-base font-semibold">
        Rincian {money(item.spent)} dari {money(item.budget)}
      </h3>
      <ul className="divide-y">
        {item.categories.map(({ categoryId, spent }) => {
          const name = names.get(categoryId) ?? "Kategori";
          return (
            <li key={categoryId}>
              <Link
                href={budgetTransactionsHref(period, categoryId)}
                aria-label={`Lihat transaksi ${name}`}
                className="flex min-h-11 items-center gap-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {money(spent)}
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
