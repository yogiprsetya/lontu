"use client";

import useSWR, { mutate } from "swr";
import { removeBudgetFromUsage } from "@/lib/budget-cache";
import { sendJSON } from "@/lib/fetcher";
import type { Budget, BudgetPeriod, BudgetSetInput, BudgetSuggestion, BudgetUsage } from "@/lib/schemas/budget";

const BUDGETS_KEY = /^\/api\/budgets($|[/?])/;

export function budgetsKey(period: BudgetPeriod) {
  return `/api/budgets?period=${period}`;
}

export function budgetSuggestionKey(period: BudgetPeriod, income?: number) {
  return `/api/budgets/suggestion?period=${period}${income === undefined ? "" : `&income=${income}`}`;
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

/** Fetches only while the panel is open; keeps the last result on screen while a new income loads. */
export function useBudgetSuggestion(period: BudgetPeriod, income: number | undefined, enabled: boolean) {
  return useSWR<BudgetSuggestion>(enabled ? budgetSuggestionKey(period, income) : null, { keepPreviousData: true });
}

export async function setBudgets(input: BudgetSetInput) {
  const saved = await sendJSON<Budget[]>("/api/budgets", "PUT", input);
  await revalidateBudgets();
  return saved;
}

/** Clears the budget in the month's cache at once; if the server refuses, a revalidation brings it back. */
export async function deleteBudget(period: BudgetPeriod, id: string) {
  void mutate(budgetsKey(period), (usage?: BudgetUsage) => usage && removeBudgetFromUsage(usage, id), {
    revalidate: false,
  });
  try {
    const deleted = await sendJSON<Budget>(`/api/budgets/${id}`, "DELETE");
    await revalidateBudgets();
    return deleted;
  } catch (err) {
    await revalidateBudgets();
    throw err;
  }
}

export async function restoreBudget(id: string) {
  const restored = await sendJSON<Budget>(`/api/budgets/${id}/restore`, "POST");
  await revalidateBudgets();
  return restored;
}

/** Fills `to` from the month before; only categories without an active budget are touched. */
export async function copyBudgets(to: BudgetPeriod) {
  const result = await sendJSON<{ copied: number }>("/api/budgets/copy", "POST", { to });
  await revalidateBudgets();
  return result;
}
