import { describe, expect, it } from "vitest";
import { categoriesKey, filterByKind, groupBySpendingType } from "@/hooks/use-categories";
import { isResourceKey } from "@/lib/cache-invalidation";
import type { Category } from "@/lib/schemas/category";

function category(name: string, kind: Category["kind"], spendingType: Category["spendingType"] = null): Category {
  return { id: name, name, kind, spendingType, archivedAt: null, createdAt: "2026-10-20T00:00:00.000Z" };
}

const list = [
  category("Gaji", "income"),
  category("Tabungan", "saving"),
  category("Makan", "spending", "needs"),
  category("Hiburan", "spending", "wants"),
  category("Tagihan", "spending", "needs"),
];

describe("filterByKind", () => {
  it("keeps the order and only the requested kind", () => {
    expect(filterByKind(list, "spending").map((c) => c.name)).toEqual(["Makan", "Hiburan", "Tagihan"]);
  });

  it("returns everything without a kind", () => {
    expect(filterByKind(list)).toBe(list);
  });
});

describe("groupBySpendingType", () => {
  it("splits spending categories into needs and wants", () => {
    const groups = groupBySpendingType(filterByKind(list, "spending"));
    expect(groups.needs.map((c) => c.name)).toEqual(["Makan", "Tagihan"]);
    expect(groups.wants.map((c) => c.name)).toEqual(["Hiburan"]);
  });
});

describe("categories SWR keys", () => {
  it("builds the contract keys", () => {
    expect(categoriesKey()).toBe("/api/categories");
    expect(categoriesKey({ includeArchived: true })).toBe("/api/categories?include=archived");
  });

  it("matches only category keys", () => {
    expect(isResourceKey("categories", "/api/categories?include=archived")).toBe(true);
    expect(isResourceKey("categories", "/api/accounts")).toBe(false);
  });
});
