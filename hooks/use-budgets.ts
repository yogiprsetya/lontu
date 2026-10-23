"use client";

import useSWR, { mutate } from "swr";
import { sendJSON } from "@/lib/fetcher";
import type { Budget, BudgetPeriod, BudgetSetInput, BudgetUsage } from "@/lib/schemas/budget";

const BUDGETS_KEY = /^\/api\/budgets($|[/?])/;

export function budgetsKey(period: BudgetPeriod) {
  return `/api/budgets?period=${period}`;
}

export function isBudgetsKey(key: unknown) {
  return typeof key === "string" && BUDGETS_KEY.test(key);
}

/** Refreshes usage and suggestion entries for every month. */
export function revalidateBudgets() {
  return mutate(isBudgetsKey);
}

export function useBudgets(period: BudgetPeriod) {
  return useSWR<BudgetUsage>(budgetsKey(period));
}

export async function setBudgets(input: BudgetSetInput) {
  const saved = await sendJSON<Budget[]>("/api/budgets", "PUT", input);
  await revalidateBudgets();
  return saved;
}
