import { describe, expect, it } from "vitest";
import { changeTone, formatRangeLabel, formatShortPeriod, percentChange, sumBalances } from "@/lib/dashboard-format";
import type { Account } from "@/lib/schemas/account";

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
    expect(result).toEqual({ total: 23_800_000, byType: { transaction: 3_800_000, asset: 20_000_000 } });
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
