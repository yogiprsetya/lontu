"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { BudgetBreakdown } from "@/components/budgets/budget-breakdown";
import { BudgetRow } from "@/components/budgets/budget-row";
import { MonthStepper } from "@/components/budgets/month-stepper";
import { FormActions } from "@/components/layout/form-actions";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useBudgetUsage } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { archiveLabel } from "@/lib/archived";
import { budgetPeriodFromParam, emptyBudgetMessage } from "@/lib/budget-format";
import { compareByAttention } from "@/lib/budget-status";
import { todayInJakarta } from "@/lib/date";
import { formatPeriodLabel } from "@/lib/period";
import type { BudgetPeriod } from "@/lib/schemas/budget";
import type { BudgetUsage } from "@/lib/schemas/budget-usage";
import { useUIStore } from "@/stores/ui";

// Loaded when first opened, not with the page.
const BudgetForm = lazy(() =>
  import("@/components/forms/budget-form").then((m) => ({ default: m.BudgetForm })),
);

function ViewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-28 w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

type ListProps = { usage: BudgetUsage; names: Map<string, string> };

/** "Makan, Jajan" for the rows' `categoryId`s, in their order. */
function categoryNames(names: Map<string, string>, rows: { categoryId: string }[]) {
  return rows.map((row) => names.get(row.categoryId) ?? "Kategori").join(", ");
}

function BudgetList({ usage, names, onOpen }: ListProps & { onOpen: (budgetId: string) => void }) {
  // The rows that need attention first; the API orders by type and name.
  const items = useMemo(() => [...usage.items].sort(compareByAttention), [usage.items]);

  return (
    <ul className="surface divide-y px-4" aria-label="Daftar budget">
      {items.map((item) => (
        <BudgetRow
          key={item.budgetId}
          item={item}
          categoryNames={categoryNames(names, item.categories)}
          onOpen={() => onOpen(item.budgetId)}
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
      {money(total)} tanpa budget · {categoryNames(names, usage.unbudgeted)}
    </p>
  );
}

/** The month lives in the URL so a refresh or a shared link shows the same budget. */
export function BudgetView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = todayInJakarta();
  const period = budgetPeriodFromParam(searchParams.get("period"), today);
  // Budgets change only in the current month; earlier months are read-only.
  const isCurrent = period === today.slice(0, 7);
  const [adding, setAdding] = useState(false);
  // Only the id: the budget itself always comes from the SWR cache.
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const openModal = useUIStore((s) => s.open);
  const usage = useBudgetUsage(period);
  const categories = useCategories({ includeArchived: true });

  const opened = usage.data?.items.find((i) => i.budgetId === openId);

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
        <Button onClick={() => openModal("manageCategories", { kind: "spending" })}>
          Tambah kategori
        </Button>
      </div>
    );
  } else {
    content = (
      <>
        {usage.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-8 text-center">
            <p className="text-muted-foreground">{emptyBudgetMessage(period, today)}</p>
            {isCurrent && <Button onClick={() => setAdding(true)}>Tambah budget</Button>}
          </div>
        ) : (
          <BudgetList usage={usage.data} names={names} onOpen={setOpenId} />
        )}
        <UnbudgetedLine usage={usage.data} names={names} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <MonthStepper period={period} onChange={setPeriod} />
        {isCurrent && (
          <Button
            aria-label="Tambah budget"
            size="icon-lg"
            className="shrink-0"
            disabled={!usage.data || !categories.data}
            onClick={() => setAdding(true)}
          >
            <PlusIcon className="size-6" aria-hidden />
          </Button>
        )}
      </div>
      {content}
      <ResponsiveModal
        open={adding}
        onOpenChange={setAdding}
        dismissible={!saving}
        title="Tambah budget"
        description={`Mulai ${formatPeriodLabel(period)}`}
        footer={
          <FormActions form="budget-form" onCancel={() => setAdding(false)} isSubmitting={saving} />
        }
      >
        {adding && usage.data && categories.data && (
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <BudgetForm
              categories={categories.data}
              usage={usage.data}
              onDone={() => setAdding(false)}
              onSubmitting={setSaving}
            />
          </Suspense>
        )}
      </ResponsiveModal>
      <ResponsiveModal
        open={!!opened}
        onOpenChange={(open) => !open && setOpenId(null)}
        dismissible={!saving}
        title={opened?.name ?? "Budget"}
        description={formatPeriodLabel(period)}
        footer={
          isCurrent ? (
            <FormActions
              form="budget-form"
              onCancel={() => setOpenId(null)}
              isSubmitting={saving}
            />
          ) : undefined
        }
      >
        {opened && categories.data && (
          <div className="flex flex-col gap-6">
            <BudgetBreakdown period={period} item={opened} names={names} />
            {isCurrent && usage.data && (
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <BudgetForm
                  key={opened.budgetId}
                  categories={categories.data}
                  usage={usage.data}
                  budget={opened}
                  onDone={() => setOpenId(null)}
                  onSubmitting={setSaving}
                />
              </Suspense>
            )}
          </div>
        )}
      </ResponsiveModal>
    </>
  );
}
