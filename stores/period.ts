"use client";

import { create } from "zustand";
import { todayInJakarta } from "@/lib/date";

type PeriodState = {
  year: number;
  /** `null` means the whole year. */
  month: number | null;
  setPeriod: (year: number, month: number | null) => void;
};

function currentPeriod() {
  const [year, month] = todayInJakarta().split("-").map(Number);
  return { year, month };
}

export const usePeriodStore = create<PeriodState>()((set) => ({
  ...currentPeriod(),
  setPeriod: (year, month) => set({ year, month }),
}));
