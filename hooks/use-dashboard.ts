"use client";

import useSWR from "swr";
import { apiKey } from "@/lib/cache-invalidation";
import type { DashboardPeriod, DashboardSummary } from "@/lib/schemas/dashboard";

export function dashboardKey(period: DashboardPeriod) {
  return apiKey("dashboard", { query: { period } });
}

export function useDashboard(period: DashboardPeriod) {
  return useSWR<DashboardSummary>(dashboardKey(period));
}
