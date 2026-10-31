"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BudgetRow } from "@/components/budgets/budget-row";
import { BudgetSummary } from "@/components/budgets/budget-summary";
import { MonthStepper } from "@/components/budgets/month-stepper";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useBudgetUsage } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { archiveLabel } from "@/lib/archived";
import { budgetPeriodFromParam } from "@/lib/budget-format";
import { compareByAttention } from "@/lib/budget-status";
import { todayInJakarta } from "@/lib/date";
import { formatPeriodLabel } from "@/lib/period";
import type { BudgetPeriod } from "@/lib/schemas/budget";
import type { BudgetUsage } from "@/lib/schemas/budget-usage";
import { useUIStore } from "@/stores/ui";

function ViewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-28 w-full rounded-2xl" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

type ListProps = { usage: BudgetUsage; names: Map<string, string> };

function BudgetList({ usage, names }: ListProps) {
  // The rows that need attention first; the API orders by type and name.
  const items = useMemo(() => [...usage.items].sort(compareByAttention), [usage.items]);
  const nameList = (ids: string[]) => ids.map((id) => names.get(id) ?? "Kategori").join(", ");

  return (
    <ul className="surface divide-y px-4" aria-label="Daftar budget">
      {items.map((item) => (
        <BudgetRow
          key={item.budgetId}
          item={item}
          categoryNames={nameList(item.categories.map((c) => c.categoryId))}
        />
      ))}
    </ul>
  );
}

function UnbudgetedLine({ usage, names }: ListProps) {
  const money = useAmountFormat();
  if (usage.unbudgeted.length === 0) return null;
  const total = usage.unbudgeted.reduce((sum, row) => sum + row.spent, 0);
  return (
    <p className="px-1 text-sm text-muted-foreground tabular-nums">
      {money(total)} tanpa budget ·{" "}
      {usage.unbudgeted.map((row) => names.get(row.categoryId) ?? "Kategori").join(", ")}
    </p>
  );
}

/** The month lives in the URL so a refresh or a shared link shows the same budget. */
export function BudgetView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = budgetPeriodFromParam(searchParams.get("period"), todayInJakarta());
  const openModal = useUIStore((s) => s.open);
  const usage = useBudgetUsage(period);
  const categories = useCategories({ includeArchived: true });

  const names = useMemo(
    () => new Map(categories.data?.map((c) => [c.id, archiveLabel(c)])),
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
  } else if (
    usage.data.items.length === 0 &&
    !categories.data.some((c) => c.kind === "spending" && !c.archivedAt)
  ) {
    content = (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
        <p className="text-muted-foreground">Belum ada kategori spending untuk diberi budget.</p>
        <Button
          className="h-11 text-base"
          onClick={() => openModal("manageCategories", { kind: "spending" })}
        >
          Tambah kategori
        </Button>
      </div>
    );
  } else {
    content = (
      <>
        <BudgetSummary summary={usage.data.summary} />
        {usage.data.items.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed px-6 py-8 text-center text-muted-foreground">
            Belum ada budget untuk {formatPeriodLabel(period)}.
          </p>
        ) : (
          <BudgetList usage={usage.data} names={names} />
        )}
        <UnbudgetedLine usage={usage.data} names={names} />
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
