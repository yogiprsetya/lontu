"use client";

import useSWR from "swr";
import type { DashboardPeriod, DashboardSummary } from "@/lib/schemas/dashboard";

export function dashboardKey(period: DashboardPeriod) {
  return `/api/dashboard?period=${period}`;
}

export function useDashboard(period: DashboardPeriod) {
  return useSWR<DashboardSummary>(dashboardKey(period));
}
