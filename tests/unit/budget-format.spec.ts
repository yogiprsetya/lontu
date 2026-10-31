import { describe, expect, it } from "vitest";
import {
  budgetCategoryOptions,
  budgetPatch,
  budgetPeriodFromParam,
  budgetTransactionsHref,
  groupStatus,
  statusLabel,
} from "@/lib/budget-format";
import { maxBudgetPeriod } from "@/lib/schemas/budget";

const today = "2026-10-23";

describe("budgetPeriodFromParam", () => {
  it.each(["2026-10", "2026-09", "2000-01", "2024-02"])("keeps %s", (value) => {
    expect(budgetPeriodFromParam(value, today)).toBe(value);
  });

  it.each([null, "", "2026-11", "2026-12", "1999-12", "2026-13", "2026", "all"])(
    "falls back to the current month for %j",
    (value) => {
      expect(budgetPeriodFromParam(value, today)).toBe("2026-10");
    },
  );

  it("stops at the current month, across a year boundary", () => {
    expect(budgetPeriodFromParam("2026-12", "2026-11-15")).toBe("2026-11");
    expect(budgetPeriodFromParam("2027-01", "2026-12-31")).toBe("2026-12");
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

describe("budgetCategoryOptions", () => {
  const category = (
    id: string,
    name: string,
    spendingType: "needs" | "wants" | null,
    archived = false,
  ) => ({
    id,
    name,
    kind: spendingType ? ("spending" as const) : ("income" as const),
    spendingType,
    archivedAt: archived ? "2026-10-01T00:00:00.000Z" : null,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const categories = [
    category("jajan", "jajan", "wants"),
    category("hiburan", "Hiburan", "wants"),
    category("hobi", "Hobi", "wants"),
    category("lama", "Lama", "wants", true),
    category("buku", "Buku", "wants", true),
    category("makan", "Makan", "needs"),
    category("gaji", "Gaji", null),
  ];
  const usage = {
    items: [
      { budgetId: "senang", name: "Senang-senang", categories: [{ categoryId: "hiburan" }] },
      {
        budgetId: "mine",
        name: "Punyaku",
        categories: [{ categoryId: "jajan" }, { categoryId: "lama" }],
      },
    ],
  };

  it("lists the type's categories by name, marking free, own and taken ones", () => {
    expect(
      budgetCategoryOptions({ categories, usage, budgetId: "mine", spendingType: "wants" }),
    ).toEqual([
      { id: "hiburan", name: "Hiburan", status: "taken", takenBy: "Senang-senang" },
      { id: "hobi", name: "Hobi", status: "free" },
      { id: "jajan", name: "jajan", status: "own" },
      { id: "lama", name: "Lama (arsip)", status: "own" },
    ]);
  });

  it("treats every used category as taken for a new budget and hides archived ones", () => {
    expect(
      budgetCategoryOptions({ categories, usage, spendingType: "wants" }).map((o) => [
        o.id,
        o.status,
      ]),
    ).toEqual([
      ["hiburan", "taken"],
      ["hobi", "free"],
      ["jajan", "taken"],
    ]);
  });

  it("shows only the chosen type", () => {
    expect(budgetCategoryOptions({ categories, usage, spendingType: "needs" })).toEqual([
      { id: "makan", name: "Makan", status: "free" },
    ]);
  });
});

describe("budgetPatch", () => {
  const initial = { name: "Jajan", amount: 800_000, categoryIds: ["jajan", "hiburan"] };

  it("sends only the fields that changed", () => {
    expect(budgetPatch(initial, { ...initial, amount: 900_000 })).toEqual({ amount: 900_000 });
    expect(budgetPatch(initial, { ...initial, name: "Hura" })).toEqual({ name: "Hura" });
  });

  it("compares categories as a set", () => {
    expect(budgetPatch(initial, { ...initial, categoryIds: ["hiburan", "jajan"] })).toEqual({});
    expect(budgetPatch(initial, { ...initial, categoryIds: ["jajan"] })).toEqual({
      categoryIds: ["jajan"],
    });
  });
});
