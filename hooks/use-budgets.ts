"use client";

import useSWR from "swr";
import { removeBudgetFromUsage } from "@/lib/budget-cache";
import { apiKey, invalidate, removeOptimistically } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { Budget, BudgetPeriod, BudgetSetInput, BudgetSuggestion, BudgetUsage } from "@/lib/schemas/budget";

export function budgetsKey(period: BudgetPeriod) {
  return apiKey("budgets", { query: { period } });
}

export function budgetSuggestionKey(period: BudgetPeriod, income?: number) {
  return apiKey("budgets", { path: "suggestion", query: { period, income } });
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
  await invalidate("budgets");
  return saved;
}

/** Clears the budget in the month's cache at once; if the server refuses, a revalidation brings it back. */
export function deleteBudget(period: BudgetPeriod, id: string) {
  return removeOptimistically({
    match: budgetsKey(period),
    update: (usage?: BudgetUsage) => usage && removeBudgetFromUsage(usage, id),
    send: () => sendJSON<Budget>(`/api/budgets/${id}`, "DELETE"),
    resource: "budgets",
  });
}

export async function restoreBudget(id: string) {
  const restored = await sendJSON<Budget>(`/api/budgets/${id}/restore`, "POST");
  await invalidate("budgets");
  return restored;
}

/** Fills `to` from the month before; only categories without an active budget are touched. */
export async function copyBudgets(to: BudgetPeriod) {
  const result = await sendJSON<{ copied: number }>("/api/budgets/copy", "POST", { to });
  await invalidate("budgets");
  return result;
}
