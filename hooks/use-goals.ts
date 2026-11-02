"use client";

import useSWR from "swr";
import { apiKey, invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { GoalCreateInput, GoalProgress } from "@/lib/schemas/goal";

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
