"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BudgetRow } from "@/components/budgets/budget-row";
import { BudgetSummary } from "@/components/budgets/budget-summary";
import { MonthStepper } from "@/components/budgets/month-stepper";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgets } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { budgetPeriodFromParam } from "@/lib/budget-format";
import { todayInJakarta } from "@/lib/date";
import type { BudgetPeriod, BudgetUsageItem } from "@/lib/schemas/budget";
import { useUIStore } from "@/stores/ui";

const GROUPS = [
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
] as const;

function ViewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-28 w-full" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

/** The month lives in the URL so a refresh or a shared link shows the same budget. */
export function BudgetView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = budgetPeriodFromParam(searchParams.get("period"), todayInJakarta());
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const openModal = useUIStore((s) => s.open);
  const usage = useBudgets(period);
  const categories = useCategories({ includeArchived: true });

  const names = useMemo(
    () => new Map(categories.data?.map((c) => [c.id, c.archivedAt ? `${c.name} (arsip)` : c.name])),
    [categories.data],
  );

  // replace, not push: stepping through months must not fill the back stack.
  function setPeriod(next: BudgetPeriod) {
    router.replace(`${pathname}?period=${next}`, { scroll: false });
  }

  const error = usage.error ?? categories.error;
  let content;
  if (error) {
    content = (
      <LoadError
        message="Gagal memuat budget."
        onRetry={() => {
          void usage.mutate();
          void categories.mutate();
        }}
      />
    );
  } else if (!usage.data || !categories.data) {
    content = <ViewSkeleton />;
  } else if (usage.data.items.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-muted-foreground">Belum ada kategori spending untuk diberi budget.</p>
        <Button className="h-11 text-base" onClick={() => openModal("manageCategories", { kind: "spending" })}>
          Tambah kategori
        </Button>
      </div>
    );
  } else {
    const items = usage.data.items;
    const rowsOf = (type: BudgetUsageItem["spendingType"]) => items.filter((i) => i.spendingType === type);
    content = (
      <>
        <BudgetSummary summary={usage.data.summary} hideAmounts={hideAmounts} />
        {GROUPS.map(({ key, label }) => {
          const rows = rowsOf(key);
          if (rows.length === 0) return null;
          return (
            <section key={key} aria-labelledby={`budget-${key}`}>
              <h2 id={`budget-${key}`} className="text-sm font-semibold text-muted-foreground">
                {label}
              </h2>
              <ul className="divide-y">
                {rows.map((item) => (
                  <BudgetRow
                    key={item.categoryId}
                    item={item}
                    name={names.get(item.categoryId) ?? "Kategori"}
                    hideAmounts={hideAmounts}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <MonthStepper period={period} onChange={setPeriod} />
      </div>
      {content}
    </>
  );
}
