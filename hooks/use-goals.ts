"use client";

import useSWR from "swr";
import { apiKey, invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { GoalCreateInput, GoalProgress, GoalUpdateInput } from "@/lib/schemas/goal";

type Options = { includeArchived?: boolean };

export function goalsKey({ includeArchived = false }: Options = {}) {
  return apiKey("goals", { query: { includeArchived: includeArchived ? "true" : undefined } });
}

export function useGoals(options: Options = {}) {
  return useSWR<GoalProgress[]>(goalsKey(options));
}

export async function createGoal(input: GoalCreateInput) {
  const goal = await sendJSON<GoalProgress>("/api/goals", "POST", input);
  await invalidate("goals");
  return goal;
}

export async function updateGoal(id: string, input: GoalUpdateInput) {
  const goal = await sendJSON<GoalProgress>(`/api/goals/${id}`, "PATCH", input);
  await invalidate("goals");
  return goal;
}

export async function archiveGoal(id: string) {
  const goal = await sendJSON<GoalProgress>(`/api/goals/${id}`, "DELETE");
  await invalidate("goals");
  return goal;
}

/** Throws ApiError 409 GOAL_RESTORE_CONFLICT when another goal took its name or an account. */
export async function restoreGoal(id: string) {
  const goal = await sendJSON<GoalProgress>(`/api/goals/${id}/restore`, "POST");
  await invalidate("goals");
  return goal;
}
