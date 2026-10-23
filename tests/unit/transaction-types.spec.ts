import { describe, expect, it } from "vitest";
import { TRANSACTION_TYPES, isTransactionType } from "@/lib/transaction-types";

describe("isTransactionType", () => {
  it.each(TRANSACTION_TYPES)("accepts %s", (type) => {
    expect(isTransactionType(type)).toBe(true);
  });

  it.each(["refund", "Expense", "", "transfers"])("rejects %j", (type) => {
    expect(isTransactionType(type)).toBe(false);
  });

  it("lists the four types in menu order", () => {
    expect(TRANSACTION_TYPES).toEqual(["income", "expense", "saving", "transfer"]);
  });
});
