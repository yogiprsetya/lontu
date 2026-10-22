import { describe, expect, it } from "vitest";
import { removeFromPages } from "@/lib/transaction-cache";
import type { Transaction, TransactionPage } from "@/lib/schemas/transaction";

function tx(id: string): Transaction {
  return {
    id,
    type: "expense",
    amount: 1,
    date: "2026-10-01",
    accountId: "a",
    toAccountId: null,
    categoryId: "c",
    description: null,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
  };
}

const page = (ids: string[], nextCursor: string | null): TransactionPage => ({ items: ids.map(tx), nextCursor });

describe("removeFromPages", () => {
  it("removes the row from whichever page holds it", () => {
    const pages = [page(["1", "2"], "c1"), page(["3", "4"], "c2"), page(["5"], null)];
    const result = removeFromPages(pages, "4");
    expect(result.map((p) => p.items.map((t) => t.id))).toEqual([["1", "2"], ["3"], ["5"]]);
  });

  it("keeps every cursor, so later pages can still be loaded", () => {
    const result = removeFromPages([page(["1"], "c1"), page(["2"], null)], "1");
    expect(result.map((p) => p.nextCursor)).toEqual(["c1", null]);
  });

  it("leaves an emptied page in place rather than dropping it", () => {
    const result = removeFromPages([page(["1"], "c1"), page(["2"], null)], "1");
    expect(result).toHaveLength(2);
    expect(result[0].items).toEqual([]);
  });

  it("returns equal pages when the id is not present", () => {
    const pages = [page(["1"], null)];
    expect(removeFromPages(pages, "zzz")).toEqual(pages);
  });

  it("does not mutate its input", () => {
    const pages = [page(["1", "2"], null)];
    const snapshot = structuredClone(pages);
    removeFromPages(pages, "1");
    expect(pages).toEqual(snapshot);
  });
});
