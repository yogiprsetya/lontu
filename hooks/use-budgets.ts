"use client";

import useSWR from "swr";
import { endBudgetInUsage } from "@/lib/budget-cache";
import { apiKey, invalidate, removeOptimistically } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type {
  Budget,
  BudgetCreateInput,
  BudgetPeriod,
  BudgetSetInput,
  BudgetUpdateInput,
  BudgetUsage,
  BudgetVersion,
} from "@/lib/schemas/budget";
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

/** Ends the budget in the month's cache at once; if the server refuses, a revalidation brings it back. */
export function deleteBudget(period: BudgetPeriod, id: string) {
  return removeOptimistically({
    match: budgetUsageKey(period),
    update: (usage?: NamedBudgetUsage) => usage && endBudgetInUsage(usage, id),
    send: () => sendJSON<BudgetVersion>(`/api/budgets/${id}`, "DELETE"),
    resource: "budgets",
  });
}

export async function restoreBudget(id: string) {
  const restored = await sendJSON<BudgetVersion>(`/api/budgets/${id}/restore`, "POST");
  await invalidate("budgets");
  return restored;
}

export async function createBudget(input: BudgetCreateInput) {
  const created = await sendJSON<BudgetVersion>("/api/budgets", "POST", input);
  await invalidate("budgets");
  return created;
}

export async function updateBudget(id: string, input: BudgetUpdateInput) {
  const updated = await sendJSON<BudgetVersion>(`/api/budgets/${id}`, "PATCH", input);
  await invalidate("budgets");
  return updated;
}
