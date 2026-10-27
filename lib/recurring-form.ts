import type { RecurringCreateInput, RecurringRule, RecurringType, RecurringUpdateInput } from "@/lib/schemas/recurring";

export type RulePreset = { type: RecurringType; isPayday?: boolean };

export function ruleFormDefaults({ rule, preset }: { rule?: RecurringRule; preset?: RulePreset }): RecurringCreateInput {
  if (rule) {
    const { type, name, amount, accountId, categoryId, dayOfMonth, isPayday } = rule;
    return { type, name, amount, accountId, categoryId, dayOfMonth, isPayday };
  }
  return {
    type: preset?.type ?? "expense",
    name: "",
    amount: 0,
    accountId: "",
    categoryId: "",
    dayOfMonth: 1,
    isPayday: preset?.isPayday ?? false,
  };
}

export function toUpdateInput({ name, amount, accountId, categoryId, dayOfMonth, isPayday }: RecurringCreateInput): RecurringUpdateInput {
  return { name, amount, accountId, categoryId, dayOfMonth, isPayday };
}

/** Shown under the payday switch when saving will move the flag off another rule. */
export function paydayHint(checked: boolean, currentPayday: RecurringRule | undefined, ruleId: string | undefined) {
  if (!checked || !currentPayday || currentPayday.id === ruleId) return undefined;
  return `Menggantikan ${currentPayday.name} sebagai gajian.`;
}

/** A new day on a late rule recomputes the due date from today, so missed occurrences are dropped. */
export function reschedulesMissed(rule: RecurringRule | undefined, dayOfMonth: number, today: string) {
  return !!rule && dayOfMonth !== rule.dayOfMonth && rule.nextDueDate < today;
}
