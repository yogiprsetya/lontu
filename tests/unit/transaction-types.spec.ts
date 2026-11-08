import { describe, expect, it } from "vitest";
import {
  ADDABLE_TRANSACTION_TYPES,
  TRANSACTION_TYPES,
  isAddableTransactionType,
  isDeposit,
} from "@/lib/transaction-types";

describe("isAddableTransactionType", () => {
  it("offers income, expense and transfer in menu order", () => {
    expect(ADDABLE_TRANSACTION_TYPES).toEqual(["income", "expense", "transfer"]);
  });

  it("no longer offers saving, which is a transfer to an asset account", () => {
    expect(isAddableTransactionType("saving")).toBe(false);
  });
});

describe("TRANSACTION_TYPES", () => {
  it("lists the four types in menu order", () => {
    expect(TRANSACTION_TYPES).toEqual(["income", "expense", "saving", "transfer"]);
  });
});

describe("isDeposit", () => {
  const transaction = { type: "transaction" };
  const asset = { type: "asset" };

  it("is true only from a transaction account into an asset account", () => {
    expect(isDeposit(transaction, asset)).toBe(true);
    expect(isDeposit(asset, asset)).toBe(false);
    expect(isDeposit(asset, transaction)).toBe(false);
    expect(isDeposit(transaction, transaction)).toBe(false);
  });

  it("is false until both accounts are known", () => {
    expect(isDeposit(undefined, asset)).toBe(false);
    expect(isDeposit(transaction, undefined)).toBe(false);
  });
});
