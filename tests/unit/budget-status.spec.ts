import { describe, expect, it } from "vitest";
import { budgetStatus } from "@/lib/budget-status";

describe("budgetStatus", () => {
  it.each([
    [79_000, "ok", 79],
    [79_999, "ok", 79],
    [80_000, "warning", 80],
    [100_000, "warning", 100],
    [100_001, "over", 100],
    [101_000, "over", 101],
  ] as const)("spent %i of 100.000 is %s at %i%%", (spent, status, percent) => {
    expect(budgetStatus(100_000, spent)).toEqual({ remaining: 100_000 - spent, percent, status });
  });

  it("rounds percent down", () => {
    expect(budgetStatus(1_500_000, 1_300_000)).toEqual({ remaining: 200_000, percent: 86, status: "warning" });
  });

  it("keeps a negative remaining when over budget", () => {
    expect(budgetStatus(1_000, 3_000)).toEqual({ remaining: -2_000, percent: 300, status: "over" });
  });

  it("treats a zero budget with no spending as ok without a percent", () => {
    expect(budgetStatus(0, 0)).toEqual({ remaining: 0, percent: null, status: "ok" });
  });

  it("treats any spending against a zero budget as over", () => {
    expect(budgetStatus(0, 1)).toEqual({ remaining: -1, percent: null, status: "over" });
  });

  it("returns none without a budget", () => {
    expect(budgetStatus(null, 50_000)).toEqual({ remaining: null, percent: null, status: "none" });
  });

  it("does not lose precision at the 1e12 limit", () => {
    expect(budgetStatus(1e12, 1e12 - 1)).toEqual({ remaining: 1, percent: 99, status: "warning" });
  });
});
