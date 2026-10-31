"use client";

import useSWR from "swr";
import { removeBudgetFromUsage } from "@/lib/budget-cache";
import { apiKey, invalidate, removeOptimistically } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { Budget, BudgetPeriod, BudgetSetInput, BudgetUsage } from "@/lib/schemas/budget";
import type { BudgetUsage as NamedBudgetUsage } from "@/lib/schemas/budget-usage";

export function budgetsKey(period: BudgetPeriod) {
  return apiKey("budgets", { query: { period } });
}

export function useBudgets(period: BudgetPeriod) {
  return useSWR<BudgetUsage>(budgetsKey(period));
}

export function budgetUsageKey(period: BudgetPeriod) {
  return apiKey("budgets", { path: "usage", query: { period } });
}

export function useBudgetUsage(period: BudgetPeriod) {
  return useSWR<NamedBudgetUsage>(budgetUsageKey(period));
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
