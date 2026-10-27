import { TypeChip } from "@/components/transactions/type-chip";
import { formatDueLabel, formatSchedule } from "@/lib/recurring-format";
import type { RecurringRule } from "@/lib/schemas/recurring";
import { cn } from "@/lib/utils";

type Props = {
  rule: RecurringRule;
  accountName: string;
  today: string;
  hideAmounts: boolean;
  onEdit?: () => void;
  /** Trailing controls, such as the row menu or Pulihkan. */
  children?: React.ReactNode;
};

export function RuleRow({ rule, accountName, today, hideAmounts, onEdit, children }: Props) {
  const due = formatDueLabel(rule.nextDueDate, today);
  const body = (
    <>
      <TypeChip type={rule.type} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-bold">{rule.name}</span>
          {rule.isPayday && (
            <span className="shrink-0 rounded-full bg-sunny px-2 py-0.5 text-xs font-bold text-sunny-foreground">Gajian</span>
          )}
        </span>
        <span className="truncate text-sm text-muted-foreground tabular-nums">
          {formatSchedule(rule.amount, rule.dayOfMonth, hideAmounts)} · {accountName}
        </span>
        <span className={cn("text-sm", rule.archivedAt ? "text-muted-foreground" : due.overdue ? "font-bold text-expense" : "text-foreground")}>
          {rule.archivedAt ? "Diarsipkan" : `Berikutnya: ${due.text}`}
        </span>
      </span>
    </>
  );

  return (
    <li className="flex min-h-16 items-center gap-2 py-3">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {body}
        </button>
      ) : (
        <div className={cn("flex min-w-0 flex-1 items-center gap-3", rule.archivedAt && "opacity-80")}>{body}</div>
      )}
      {children}
    </li>
  );
}
