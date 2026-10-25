import { archiveLabel } from "@/lib/archived";
import { formatIDR } from "@/lib/money";
import type { ListTransactionType, Transaction } from "@/lib/schemas/transaction";
import { ADJUSTMENT_LABEL } from "@/lib/transaction-types";

// Dates are plain YYYY-MM-DD strings; reading them as UTC keeps the calendar day fixed in any local zone.
const headingFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DAY_MS = 24 * 60 * 60 * 1000;

function dayBefore(date: string) {
  return new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

export function formatDateHeading(date: string, today: string) {
  if (date === today) return "Hari ini";
  if (date === dayBefore(today)) return "Kemarin";
  return headingFormatter.format(new Date(`${date}T00:00:00Z`));
}

export type AmountTone = "income" | "expense" | "budget" | "transfer";

export const AMOUNT_TONE_CLASS: Record<AmountTone, string> = {
  income: "text-income",
  expense: "text-expense",
  budget: "text-budget",
  transfer: "text-transfer",
};

/** Colour is never the only cue: `formatSignedAmount` carries the sign too. */
export function amountTone(type: ListTransactionType, amount: number): AmountTone {
  switch (type) {
    case "income":
      return "income";
    case "expense":
      return "expense";
    case "saving":
      return "budget";
    case "transfer":
      return "transfer";
    case "adjustment":
      return amount < 0 ? "expense" : "income";
  }
}

export function formatSignedAmount(type: ListTransactionType, amount: number) {
  if (type === "transfer") return formatIDR(amount);
  const negative = type === "adjustment" ? amount < 0 : type !== "income";
  return `${negative ? "-" : "+"}${formatIDR(Math.abs(amount))}`;
}

export function groupByDate<T extends { date: string }>(items: T[]) {
  const groups: { date: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}

export type Names = Map<string, string>;

export function nameMap(items: { id: string; name: string; archivedAt: string | null }[] | undefined): Names {
  return new Map(items?.map((i) => [i.id, archiveLabel(i)]));
}

// Optional ids so an unsent create body (which has only its type's fields) works too.
export function titleOf(
  t: Pick<Transaction, "type" | "accountId"> & { toAccountId?: string | null; categoryId?: string | null },
  accounts: Names,
  categories: Names,
) {
  if (t.type === "transfer") return `${accounts.get(t.accountId) ?? "Akun"} → ${accounts.get(t.toAccountId!) ?? "Akun"}`;
  if (t.type === "adjustment") return ADJUSTMENT_LABEL;
  return (t.categoryId && categories.get(t.categoryId)) || "Tanpa kategori";
}
