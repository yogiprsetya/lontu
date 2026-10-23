import { describe, expect, it } from "vitest";
import { budgetPeriodFromParam, budgetTransactionsHref, copyResultMessage, groupStatus, statusLabel } from "@/lib/budget-format";
import { maxBudgetPeriod } from "@/lib/schemas/budget";

const today = "2026-10-23";

describe("budgetPeriodFromParam", () => {
  it.each(["2026-10", "2026-11", "2000-01", "2024-02"])("keeps %s", (value) => {
    expect(budgetPeriodFromParam(value, today)).toBe(value);
  });

  it.each([null, "", "2026-12", "1999-12", "2026-13", "2026", "all"])("falls back to the current month for %j", (value) => {
    expect(budgetPeriodFromParam(value, today)).toBe("2026-10");
  });

  it("allows January next year in December", () => {
    expect(budgetPeriodFromParam("2027-01", "2026-12-31")).toBe("2027-01");
  });
});

describe("maxBudgetPeriod", () => {
  it("is next month, across a year boundary", () => {
    expect(maxBudgetPeriod(today)).toBe("2026-11");
    expect(maxBudgetPeriod("2026-12-01")).toBe("2027-01");
  });
});

describe("statusLabel", () => {
  it("spells out warning and over so status never relies on color", () => {
    expect(statusLabel("warning")).toBe("Hampir habis");
    expect(statusLabel("over")).toBe("Melebihi budget");
    expect(statusLabel("ok")).toBeNull();
    expect(statusLabel("none")).toBeNull();
  });
});

describe("groupStatus", () => {
  it("compares only budgeted spending with the group budget", () => {
    expect(groupStatus({ budget: 2_000_000, spent: 1_900_000, unbudgetedSpent: 300_000 })).toEqual({
      budgetedSpent: 1_600_000,
      remaining: 400_000,
      percent: 80,
      status: "warning",
    });
  });

  it("has no status when the group has no budget", () => {
    expect(groupStatus({ budget: 0, spent: 200_000, unbudgetedSpent: 200_000 })).toEqual({
      budgetedSpent: 0,
      remaining: null,
      percent: null,
      status: "none",
    });
  });
});

describe("budgetTransactionsHref", () => {
  it("links to the month's expenses in one category", () => {
    expect(budgetTransactionsHref("2026-10", "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b")).toBe(
      "/transactions?period=2026-10&type=expense&categoryId=1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b",
    );
  });
});

describe("copyResultMessage", () => {
  it("counts what was copied", () => {
    expect(copyResultMessage(3, true, "September 2026")).toBe("3 budget disalin dari September 2026");
  });

  it("says 0 when the source had budgets but every category is already set", () => {
    expect(copyResultMessage(0, true, "September 2026")).toBe("0 budget disalin. Semua kategori sudah punya budget.");
  });

  it("says the source month has no budget", () => {
    expect(copyResultMessage(0, false, "September 2026")).toBe("September 2026 belum punya budget");
  });
});
