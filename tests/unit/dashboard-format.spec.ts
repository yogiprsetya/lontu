import { describe, expect, it } from "vitest";
import {
  activityPeak,
  budgetHighlights,
  changeTone,
  formatBucket,
  formatRangeLabel,
  formatShortPeriod,
  percentChange,
  sumBalances,
  topCategories,
} from "@/lib/dashboard-format";
import type { Account } from "@/lib/schemas/account";
import type { BudgetUsageItem } from "@/lib/schemas/budget";

function account(overrides: Partial<Account>): Account {
  return {
    id: crypto.randomUUID(),
    name: "Akun",
    type: "transaction",
    subtype: "debit",
    initialBalance: 0,
    balance: 0,
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("percentChange", () => {
  it.each([
    [100, 112, 12],
    [100, 88, -12],
    [3, 4, 33],
    [100, 100, 0],
  ])("%d → %d is %d%%", (previous, current, expected) => {
    expect(percentChange(current, previous)).toBe(expected);
  });

  it.each([
    [0, 50],
    [0, 0],
  ])("is null when the previous value is 0 (%d → %d)", (previous, current) => {
    expect(percentChange(current, previous)).toBeNull();
  });
});

describe("changeTone", () => {
  it("treats more spending as bad and more income, saving or net as good", () => {
    expect(changeTone("expense", 10)).toBe("bad");
    expect(changeTone("expense", -10)).toBe("good");
    expect(changeTone("income", 10)).toBe("good");
    expect(changeTone("saving", 10)).toBe("good");
    expect(changeTone("net", -10)).toBe("bad");
  });

  it("is neutral when nothing changed", () => {
    expect(changeTone("expense", 0)).toBe("neutral");
    expect(changeTone("income", 0)).toBe("neutral");
  });
});

describe("sumBalances", () => {
  it("adds active accounts per type, a negative credit card lowering the total", () => {
    const result = sumBalances([
      account({ balance: 5_000_000 }),
      account({ balance: -1_200_000, subtype: "credit_card" }),
      account({ type: "asset", subtype: "investment", balance: 20_000_000 }),
      account({ balance: 9_999_999, archivedAt: "2026-10-01T00:00:00.000Z" }),
    ]);
    expect(result).toEqual({
      total: 23_800_000,
      byType: { transaction: 3_800_000, asset: 20_000_000 },
    });
  });

  it("is 0 without accounts", () => {
    expect(sumBalances([])).toEqual({ total: 0, byType: { transaction: 0, asset: 0 } });
  });
});

describe("formatShortPeriod", () => {
  it("names a month by its short name and a year by its number", () => {
    expect(formatShortPeriod("2026-09")).toBe("Sep");
    expect(formatShortPeriod("2025-12")).toBe("Des");
    expect(formatShortPeriod("2025")).toBe("2025");
  });
});

describe("formatRangeLabel", () => {
  it("writes the month once for a range inside one month", () => {
    expect(formatRangeLabel({ from: "2026-09-01", to: "2026-09-25" })).toBe("1–25 Sep 2026");
  });

  it("writes both months for a range across months", () => {
    expect(formatRangeLabel({ from: "2027-01-01", to: "2027-02-28" })).toBe("1 Jan–28 Feb 2027");
  });

  it("is a single day when from equals to", () => {
    expect(formatRangeLabel({ from: "2026-10-01", to: "2026-10-01" })).toBe("1 Okt 2026");
  });
});

describe("formatBucket", () => {
  it("labels a day bucket by its day number on the axis and in full elsewhere", () => {
    expect(formatBucket("2026-10-01", "tick")).toBe("1");
    expect(formatBucket("2026-10-15", "tick")).toBe("15");
    expect(formatBucket("2026-10-31", "full")).toBe("31 Okt 2026");
  });

  it("labels a month bucket by its short name", () => {
    expect(formatBucket("2026-01", "tick")).toBe("Jan");
    expect(formatBucket("2026-01", "full")).toBe("Januari 2026");
  });
});

describe("activityPeak", () => {
  it("is the first bucket with the highest expense", () => {
    expect(
      activityPeak([
        { bucket: "2026-10-01", expense: 100 },
        { bucket: "2026-10-02", expense: 300 },
        { bucket: "2026-10-03", expense: 300 },
      ]),
    ).toEqual({ bucket: "2026-10-02", expense: 300 });
  });

  it("is null when nothing was spent", () => {
    expect(activityPeak([{ bucket: "2026-10-01", expense: 0 }])).toBeNull();
    expect(activityPeak([])).toBeNull();
  });
});

describe("topCategories", () => {
  const rows = (amounts: number[]) =>
    amounts.map((amount, i) => ({
      categoryId: `c${i + 1}`,
      spendingType: "needs" as const,
      amount,
    }));
  const sum = (slices: { amount: number }[]) => slices.reduce((total, s) => total + s.amount, 0);

  it("keeps the top 5 and folds the rest into Lainnya", () => {
    const slices = topCategories(rows([400, 200, 100, 100, 50, 50, 50, 50]));
    expect(slices.map((s) => s.categoryId)).toEqual(["c1", "c2", "c3", "c4", "c5", null]);
    expect(slices[5]).toEqual({ categoryId: null, amount: 150, percent: 15 });
    expect(slices[0].percent).toBe(40);
    expect(sum(slices)).toBe(1000);
  });

  it("does not make a Lainnya for a single leftover category", () => {
    const slices = topCategories(rows([300, 200, 200, 100, 100, 100]));
    expect(slices).toHaveLength(6);
    expect(slices.every((s) => s.categoryId !== null)).toBe(true);
    expect(sum(slices)).toBe(1000);
  });

  it("is empty without spending", () => {
    expect(topCategories([])).toEqual([]);
  });
});

describe("budgetHighlights", () => {
  function item(
    categoryId: string,
    status: BudgetUsageItem["status"],
    percent: number | null,
  ): BudgetUsageItem {
    return {
      categoryId,
      spendingType: "needs",
      budgetId: null,
      budget: null,
      spent: 0,
      remaining: null,
      percent,
      status,
    };
  }

  it("puts over-budget categories first, then warnings, each by percent descending", () => {
    const result = budgetHighlights([
      item("ok", "ok", 50),
      item("warn-85", "warning", 85),
      item("over-110", "over", 110),
      item("none", "none", null),
      item("warn-95", "warning", 95),
      item("over-150", "over", 150),
    ]);
    expect(result.map((i) => i.categoryId)).toEqual(["over-150", "over-110", "warn-95"]);
  });

  it("returns fewer when fewer need attention", () => {
    expect(
      budgetHighlights([item("ok", "ok", 10), item("warn", "warning", 80)]).map(
        (i) => i.categoryId,
      ),
    ).toEqual(["warn"]);
    expect(budgetHighlights([item("ok", "ok", 10)])).toEqual([]);
  });
});
