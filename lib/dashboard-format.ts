import { ACCOUNT_TYPES, type Account, type AccountType } from "@/lib/schemas/account";
import type { DashboardTotals } from "@/lib/schemas/dashboard";

export type ChangeTone = "good" | "bad" | "neutral";

/** Whole percent; null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) * 100) / previous);
}

/** The color follows meaning, not direction: more spending is bad. */
export function changeTone(metric: keyof DashboardTotals, delta: number): ChangeTone {
  if (delta === 0) return "neutral";
  const better = metric === "expense" ? delta < 0 : delta > 0;
  return better ? "good" : "bad";
}

/** Current balances of active accounts; a credit card's negative balance lowers the total. */
export function sumBalances(accounts: Account[]) {
  const byType = Object.fromEntries(ACCOUNT_TYPES.map((type) => [type, 0])) as Record<AccountType, number>;
  for (const account of accounts) {
    if (!account.archivedAt) byType[account.type] += account.balance;
  }
  return { total: Object.values(byType).reduce((sum, value) => sum + value, 0), byType };
}
