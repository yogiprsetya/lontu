"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { setBudgets, useBudgetSuggestion } from "@/hooks/use-budgets";
import {
  BUDGET_GROUPS,
  defaultSuggestionSelection,
  selectedSuggestionItems,
} from "@/lib/budget-format";
import { ApiError } from "@/lib/fetcher";
import type { BudgetPeriod, BudgetSuggestion } from "@/lib/schemas/budget";
import { formatPeriodLabel, shiftPeriod } from "@/lib/period";
import { failureMessage } from "@/lib/offline/network-error";

const INCOME_DEBOUNCE_MS = 400;

type Props = {
  period: BudgetPeriod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  names: Map<string, string>;
};

export function SuggestionPanel(props: Props) {
  // Remounted on each opening, so typed income and checkboxes start fresh while the closing animation still plays.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((n) => n + 1);
  }

  return <SuggestionContent key={`${props.period}-${session}`} {...props} />;
}

function SuggestionContent({ period, open, onOpenChange, names }: Props) {
  const onClose = () => onOpenChange(false);
  // `typed` follows the field; `income` follows it after a pause and drives the request.
  const [typed, setTyped] = useState<number | null>(null);
  const [income, setIncome] = useState<number | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [applying, setApplying] = useState(false);
  const { data, error, mutate, isValidating } = useBudgetSuggestion(period, income, open);

  useEffect(() => {
    if (typed === null) return;
    const timer = setTimeout(() => setIncome(typed), INCOME_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const checked = selected ?? (data ? defaultSuggestionSelection(data.items) : new Set<string>());
  const toApply = data ? selectedSuggestionItems(data.items, checked) : [];
  // Amounts on screen may belong to the previous income until the new one loads.
  const pending = isValidating || (typed !== null && typed !== income);

  function toggle(categoryId: string, on: boolean) {
    const next = new Set(checked);
    if (on) next.add(categoryId);
    else next.delete(categoryId);
    setSelected(next);
  }

  async function apply() {
    setApplying(true);
    try {
      await setBudgets({ period, items: toApply });
      toast.success(`${toApply.length} budget diterapkan`);
      onClose();
    } catch (err) {
      const message = err instanceof ApiError && err.fields?.items?.[0];
      toast.error(
        message
          ? `${message}. Muat ulang saran lalu coba lagi.`
          : failureMessage(err, "Gagal menerapkan saran. Coba lagi."),
      );
      setApplying(false);
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Saran 50/30/20"
      description={`Budget ${formatPeriodLabel(period)} dari income dan pengeluaran 3 bulan terakhir.`}
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 text-base"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 text-base"
            disabled={applying || pending || toApply.length === 0}
            onClick={() => void apply()}
          >
            {applying && <Loader2Icon className="animate-spin" aria-hidden />}
            Terapkan ({toApply.length})
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField
          id="suggestion-income"
          label="Income dasar"
          hint={
            data?.basisSource === "previous_month" && typed === null
              ? `Income ${formatPeriodLabel(shiftPeriod(period, -1))}`
              : "Ubah untuk menghitung ulang saran."
          }
        >
          <MoneyInput
            id="suggestion-income"
            value={typed ?? data?.basis ?? 0}
            onChange={setTyped}
            describedBy="suggestion-income-message"
          />
        </FormField>

        <SuggestionBody
          data={data}
          error={error}
          pending={pending}
          checked={checked}
          names={names}
          onToggle={toggle}
          onRetry={() => void mutate()}
        />
      </div>
    </ResponsiveModal>
  );
}

type BodyProps = {
  data: BudgetSuggestion | undefined;
  error: unknown;
  pending: boolean;
  checked: Set<string>;
  names: Map<string, string>;
  onToggle: (categoryId: string, on: boolean) => void;
  onRetry: () => void;
};

function SuggestionBody({ data, error, onRetry, ...listProps }: BodyProps) {
  if (error) {
    return <LoadError message="Gagal memuat saran." onRetry={onRetry} />;
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  if (data.basis === 0) {
    return (
      <p className="text-muted-foreground">
        Belum ada income bulan lalu. Isi income untuk melihat saran.
      </p>
    );
  }
  return <SuggestionList data={data} {...listProps} />;
}

function SuggestionList({
  data,
  pending,
  checked,
  names,
  onToggle,
}: Omit<BodyProps, "data" | "error" | "onRetry"> & { data: BudgetSuggestion }) {
  const money = useAmountFormat();
  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      <dl className="divide-y rounded-2xl bg-muted px-4">
        {[
          { label: "Needs 50%", amount: data.pools.needs },
          { label: "Wants 30%", amount: data.pools.wants },
          {
            label: "Saving 20%",
            amount: data.pools.saving,
            hint: "acuan, tidak jadi budget",
          },
        ].map(({ label, amount, hint }) => (
          <div key={label} className="flex min-h-11 items-center justify-between gap-3 py-2">
            <dt className="min-w-0">
              {label}
              {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
            </dt>
            <dd className="shrink-0 font-medium tabular-nums">{money(amount)}</dd>
          </div>
        ))}
      </dl>
      {BUDGET_GROUPS.map(({ key, label }) => {
        const rows = data.items.filter((i) => i.spendingType === key);
        if (rows.length === 0) return null;
        return (
          <fieldset key={key} className="flex flex-col">
            <legend className="text-sm font-semibold text-muted-foreground">{label}</legend>
            <div className="divide-y">
              {rows.map((item) => (
                <label key={item.categoryId} className="flex min-h-11 items-center gap-3 py-2">
                  <Checkbox
                    checked={checked.has(item.categoryId)}
                    onCheckedChange={(on) => onToggle(item.categoryId, on)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {names.get(item.categoryId) ?? "Kategori"}
                    </span>
                    {item.current !== null && (
                      <span className="block text-sm text-muted-foreground tabular-nums">
                        Ganti {money(item.current)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{money(item.amount)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
