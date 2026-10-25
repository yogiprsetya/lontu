import type { BudgetSuggestion } from "@/lib/schemas/budget";
import type { SpendingType } from "@/lib/schemas/category";

const UNIT = 1000;
// tsconfig targets below ES2020, which rules out `0n` literals.
const ZERO = BigInt(0);
const ONE = BigInt(1);

export type SuggestInput = {
  /** Income the 50/30/20 split is taken from. */
  basis: number;
  /** Active spending categories, in display order. */
  categories: { id: string; spendingType: SpendingType }[];
  /** Expense per category over the 3 months before the period; only proportions matter. */
  history: Record<string, number>;
  /** Active budget per category in the period, for marking rows that would be replaced. */
  current: Record<string, number | null>;
};

/**
 * Splits `pool` into whole units by weight with the largest remainder method, so the parts
 * always add up to the pool. BigInt keeps `units × weight` exact past 2^53; ties go to the lower id.
 */
function apportion(pool: number, categories: { id: string; weight: number }[]) {
  const units = BigInt(pool / UNIT);
  const allZero = categories.every((c) => c.weight === 0);
  const weights = categories.map((c) => BigInt(allZero ? 1 : c.weight));
  const total = weights.reduce((a, b) => a + b, ZERO);

  const shares = categories.map((c, i) => ({ id: c.id, quota: (units * weights[i]) / total, rest: (units * weights[i]) % total }));
  let spare = units - shares.reduce((a, s) => a + s.quota, ZERO);
  const byRemainder = [...shares].sort((a, b) => (a.rest === b.rest ? (a.id < b.id ? -1 : 1) : a.rest > b.rest ? -1 : 1));
  for (const share of byRemainder) {
    if (spare === ZERO) break;
    share.quota += ONE;
    spare -= ONE;
  }
  return new Map(shares.map((s) => [s.id, Number(s.quota) * UNIT]));
}

export function suggestBudgets({ basis, categories, history, current }: SuggestInput): Omit<BudgetSuggestion, "period" | "basisSource" | "basis"> {
  const needsPool = Math.floor(basis / 2 / UNIT) * UNIT;
  const wantsPool = Math.floor((basis * 3) / 10 / UNIT) * UNIT;
  const pools = { needs: needsPool, wants: wantsPool, saving: basis - needsPool - wantsPool };
  if (basis === 0) return { pools, items: [] };

  const items: BudgetSuggestion["items"] = [];
  for (const spendingType of ["needs", "wants"] as const) {
    const group = categories.filter((c) => c.spendingType === spendingType);
    if (group.length === 0) continue;
    const amounts = apportion(pools[spendingType], group.map((c) => ({ id: c.id, weight: history[c.id] ?? 0 })));
    for (const c of group) {
      items.push({ categoryId: c.id, spendingType, amount: amounts.get(c.id)!, current: current[c.id] ?? null });
    }
  }
  return { pools, items };
}
