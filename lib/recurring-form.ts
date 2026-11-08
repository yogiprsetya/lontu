import type {
  RecurringAdvanceInput,
  RecurringCreateInput,
  RecurringRule,
  RecurringType,
  RecurringUpdateInput,
  SimpleRule,
  TransferRule,
} from "@/lib/schemas/recurring";
import type { SimpleCreateInput, TransferCreateInput } from "@/lib/schemas/transaction";

export type RulePreset = { type: RecurringType; isPayday?: boolean };

export function ruleFormDefaults({
  rule,
  preset,
}: {
  rule?: RecurringRule;
  preset?: RulePreset;
}): RecurringCreateInput {
  if (rule) {
    const { type, name, amount, accountId, categoryId, toAccountId, dayOfMonth, isPayday } = rule;
    return {
      type,
      name,
      amount,
      accountId,
      categoryId: categoryId ?? undefined,
      toAccountId: toAccountId ?? undefined,
      dayOfMonth,
      isPayday,
    };
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

export function toUpdateInput({
  name,
  amount,
  accountId,
  categoryId,
  toAccountId,
  dayOfMonth,
  isPayday,
}: RecurringCreateInput): RecurringUpdateInput {
  return { name, amount, accountId, categoryId, toAccountId, dayOfMonth, isPayday };
}

/** Shown under the payday switch when saving will move the flag off another rule. */
export function paydayHint(
  checked: boolean,
  currentPayday: RecurringRule | undefined,
  ruleId: string | undefined,
) {
  if (!checked || !currentPayday || currentPayday.id === ruleId) return undefined;
  return `Menggantikan ${currentPayday.name} sebagai gajian.`;
}

/** A new day on a late rule recomputes the due date from today, so missed occurrences are dropped. */
export function reschedulesMissed(
  rule: RecurringRule | undefined,
  dayOfMonth: number,
  today: string,
) {
  return !!rule && dayOfMonth !== rule.dayOfMonth && rule.nextDueDate < today;
}

/** Catat form defaults (spec decision #11). An early occurrence is dated today: no future transactions. */
function occurrenceFields(rule: RecurringRule, occurrenceDate: string, today: string) {
  return {
    amount: rule.amount,
    date: occurrenceDate > today ? today : occurrenceDate,
    accountId: rule.accountId,
    description: rule.name,
  };
}

export function occurrenceDefaults(
  rule: SimpleRule,
  occurrenceDate: string,
  today: string,
): SimpleCreateInput {
  return {
    ...occurrenceFields(rule, occurrenceDate, today),
    type: rule.type,
    categoryId: rule.categoryId,
  };
}

export function transferOccurrenceDefaults(
  rule: TransferRule,
  occurrenceDate: string,
  today: string,
): TransferCreateInput {
  return {
    ...occurrenceFields(rule, occurrenceDate, today),
    type: "transfer",
    toAccountId: rule.toAccountId,
  };
}

/** `id` is created once per form, so a resubmit after a lost response replays instead of posting twice. */
export function recurringPostBody(
  input: SimpleCreateInput | TransferCreateInput,
  { id, occurrenceDate }: { id: string; occurrenceDate: string },
): Extract<RecurringAdvanceInput, { action: "post" }> {
  const { amount, date, accountId, description } = input;
  const target =
    input.type === "transfer"
      ? { toAccountId: input.toAccountId }
      : { categoryId: input.categoryId };
  return { action: "post", occurrenceDate, id, amount, date, accountId, description, ...target };
}
