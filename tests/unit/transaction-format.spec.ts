import { describe, expect, it } from "vitest";
import { amountTone, formatDateHeading, formatSignedAmount, groupByDate } from "@/lib/transaction-format";

describe("formatDateHeading", () => {
  it("labels today and yesterday", () => {
    expect(formatDateHeading("2026-10-22", "2026-10-22")).toBe("Hari ini");
    expect(formatDateHeading("2026-10-21", "2026-10-22")).toBe("Kemarin");
  });

  it("finds yesterday across month and year boundaries", () => {
    expect(formatDateHeading("2026-09-30", "2026-10-01")).toBe("Kemarin");
    expect(formatDateHeading("2025-12-31", "2026-01-01")).toBe("Kemarin");
  });

  it("formats other dates without shifting a day", () => {
    expect(formatDateHeading("2026-10-01", "2026-10-22")).toBe("Kam, 1 Okt 2026");
    expect(formatDateHeading("2026-12-31", "2027-01-05")).toBe("Kam, 31 Des 2026");
  });
});

describe("formatSignedAmount", () => {
  it.each([
    ["income", 25_000, "+Rp25.000"],
    ["expense", 25_000, "-Rp25.000"],
    ["saving", 25_000, "-Rp25.000"],
    ["transfer", 25_000, "Rp25.000"],
    ["adjustment", 5_000, "+Rp5.000"],
    ["adjustment", -5_000, "-Rp5.000"],
  ] as const)("%s %i → %s", (type, amount, text) => {
    expect(formatSignedAmount(type, amount)).toBe(text);
  });
});

describe("amountTone", () => {
  it.each([
    ["income", 1, "income"],
    ["expense", 1, "expense"],
    ["saving", 1, "budget"],
    ["transfer", 1, "transfer"],
    ["adjustment", 1, "income"],
    ["adjustment", -1, "expense"],
  ] as const)("%s %i → %s", (type, amount, tone) => {
    expect(amountTone(type, amount)).toBe(tone);
  });
});

describe("groupByDate", () => {
  it("groups consecutive items by date, keeping order", () => {
    const items = [{ date: "b", n: 1 }, { date: "b", n: 2 }, { date: "a", n: 3 }];
    expect(groupByDate(items)).toEqual([
      { date: "b", items: [items[0], items[1]] },
      { date: "a", items: [items[2]] },
    ]);
  });

  it("returns an empty list for no items", () => {
    expect(groupByDate([])).toEqual([]);
  });
});
