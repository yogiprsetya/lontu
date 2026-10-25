import { describe, expect, it } from "vitest";
import { suggestBudgets, type SuggestInput } from "@/lib/budget-suggestion";

const needs = (id: string) => ({ id, spendingType: "needs" as const });
const wants = (id: string) => ({ id, spendingType: "wants" as const });

function input(overrides: Partial<SuggestInput> = {}): SuggestInput {
  return { basis: 10_000_000, categories: [], history: {}, current: {}, ...overrides };
}

function sumOf(items: { spendingType: string; amount: number }[], type: string) {
  return items.filter((i) => i.spendingType === type).reduce((s, i) => s + i.amount, 0);
}

describe("suggestBudgets pools", () => {
  it("splits 50/30/20", () => {
    expect(suggestBudgets(input()).pools).toEqual({ needs: 5_000_000, wants: 3_000_000, saving: 2_000_000 });
  });

  it("rounds needs and wants down to Rp1.000 and leaves the rest in saving", () => {
    expect(suggestBudgets(input({ basis: 7_777_777 })).pools).toEqual({
      needs: 3_888_000,
      wants: 2_333_000,
      saving: 1_556_777,
    });
  });

  it("has no items for a zero basis", () => {
    const result = suggestBudgets(input({ basis: 0, categories: [needs("a")], history: { a: 100 } }));
    expect(result).toEqual({ pools: { needs: 0, wants: 0, saving: 0 }, items: [] });
  });
});

describe("suggestBudgets items", () => {
  it("is proportional to the 3-month history within a group", () => {
    const { items } = suggestBudgets(input({ categories: [needs("a"), needs("b")], history: { a: 300, b: 100 } }));
    expect(items).toEqual([
      { categoryId: "a", spendingType: "needs", amount: 3_750_000, current: null },
      { categoryId: "b", spendingType: "needs", amount: 1_250_000, current: null },
    ]);
  });

  it("splits evenly when a group has no history, the remainder going to lower ids", () => {
    const { items } = suggestBudgets(input({ categories: [needs("c"), needs("a"), needs("b")] }));
    expect(items.map((i) => [i.categoryId, i.amount])).toEqual([
      ["c", 1_666_000],
      ["a", 1_667_000],
      ["b", 1_667_000],
    ]);
  });

  it("gives remainders to the largest fractions first", () => {
    // 3.000 units × (1, 2, 4) / 7 = 428.57, 857.14, 1714.28: one spare unit, to "x".
    const { items } = suggestBudgets(
      input({ categories: [wants("x"), wants("y"), wants("z")], history: { x: 1, y: 2, z: 4 } }),
    );
    expect(items.map((i) => i.amount)).toEqual([429_000, 857_000, 1_714_000]);
  });

  it("leaves out a group without categories", () => {
    const { items } = suggestBudgets(input({ categories: [wants("x")], history: { x: 5 } }));
    expect(items).toEqual([{ categoryId: "x", spendingType: "wants", amount: 3_000_000, current: null }]);
  });

  it("lists needs before wants and passes current budgets through", () => {
    const { items } = suggestBudgets(
      input({ categories: [wants("w"), needs("n")], current: { w: 250_000, n: null } }),
    );
    expect(items.map((i) => [i.categoryId, i.current])).toEqual([
      ["n", null],
      ["w", 250_000],
    ]);
  });

  it("stays exact with weights near the 1e12 limit", () => {
    const { items } = suggestBudgets(
      input({ basis: 1e12, categories: [needs("a"), needs("b")], history: { a: 3e12 - 1, b: 1 } }),
    );
    expect(sumOf(items, "needs")).toBe(5e11);
  });

  it("always sums to each pool in multiples of Rp1.000, deterministically", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed;
    };
    for (let run = 0; run < 50; run++) {
      const categories = Array.from({ length: 1 + (random() % 12) }, (_, i) =>
        random() % 2 ? needs(`n${i}`) : wants(`w${i}`),
      );
      const history = Object.fromEntries(categories.map((c) => [c.id, random() % 5 ? random() % 3_000_000 : 0]));
      const basis = random() % 50_000_000;
      const args = input({ basis, categories, history });
      const result = suggestBudgets(args);

      expect(suggestBudgets(args)).toEqual(result);
      expect(result.items.every((i) => i.amount % 1000 === 0 && i.amount >= 0)).toBe(true);
      for (const type of ["needs", "wants"] as const) {
        if (categories.some((c) => c.spendingType === type)) expect(sumOf(result.items, type)).toBe(result.pools[type]);
      }
    }
  });
});
