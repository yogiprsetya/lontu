import { daysBetween } from "@/lib/period";
import { advanceDate } from "@/lib/recurring-schedule";
import type { ForecastItem, PaydayForecast, RecurringRule } from "@/lib/schemas/recurring";

/**
 * What is committed before the next payday and what is left. Only expense and saving rules count:
 * income other than the payday is left out to stay conservative (spec Open question #2). An
 * occurrence on payday itself belongs to the next cycle, since the salary is in by then.
 */
export function paydayForecast({
  rules,
  spendable,
  today,
}: {
  rules: RecurringRule[];
  spendable: number;
  today: string;
}): PaydayForecast {
  const active = rules.filter((r) => !r.archivedAt);
  const payday = active.find((r) => r.isPayday);
  if (!payday) return { status: "no_payday" };
  if (payday.nextDueDate <= today)
    return { status: "payday_due", ruleId: payday.id, dueDate: payday.nextDueDate };

  const named: (ForecastItem & { name: string })[] = [];
  for (const rule of active) {
    if (rule.type === "income") continue;
    for (
      let due = rule.nextDueDate;
      due < payday.nextDueDate;
      due = advanceDate(rule.dayOfMonth, due)
    ) {
      named.push({ ruleId: rule.id, dueDate: due, amount: rule.amount, name: rule.name });
    }
  }
  named.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
  const items = named.map(({ ruleId, dueDate, amount }) => ({ ruleId, dueDate, amount }));
  const committed = items.reduce((sum, i) => sum + i.amount, 0);

  return {
    status: "ok",
    payday: payday.nextDueDate,
    daysLeft: daysBetween(today, payday.nextDueDate),
    spendable,
    committed,
    free: spendable - committed,
    items,
  };
}
