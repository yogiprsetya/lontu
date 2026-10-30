import { describe, expect, it } from "vitest";
import { balanceAfter, signedEffect } from "@/lib/transaction-balance";

describe("balanceAfter", () => {
  it("is not short when the balance lands exactly on zero", () => {
    expect(balanceAfter({ balance: 25_000, subtype: "debit", effect: -25_000 })).toEqual({
      after: 0,
      short: false,
    });
  });

  it("is short when the balance goes negative", () => {
    expect(balanceAfter({ balance: 25_000, subtype: null, effect: -30_000 })).toEqual({
      after: -5_000,
      short: true,
    });
  });

  it("is never short for a credit card", () => {
    expect(balanceAfter({ balance: 0, subtype: "credit_card", effect: -30_000 })).toEqual({
      after: -30_000,
      short: false,
    });
  });

  it("is not short for a positive effect, even on a negative balance", () => {
    expect(balanceAfter({ balance: -10_000, subtype: "debit", effect: 5_000 })).toEqual({
      after: -5_000,
      short: false,
    });
  });

  it("adds back the effect of the transaction being edited", () => {
    // 100.000 opening, old expense 30.000 already in the balance, edited to 90.000.
    expect(
      balanceAfter({ balance: 70_000, subtype: "debit", effect: -90_000, previousEffect: -30_000 }),
    ).toEqual({
      after: 10_000,
      short: false,
    });
  });

  it("counts the admin fee together with the transfer amount on the source account", () => {
    // Transfer 90.000 + fee 15.000 from 100.000.
    expect(
      balanceAfter({ balance: 100_000, subtype: "debit", effect: -(90_000 + 15_000) }),
    ).toEqual({
      after: -5_000,
      short: true,
    });
  });
});

describe("signedEffect", () => {
  it("adds for income and subtracts for expense and saving", () => {
    expect(signedEffect("income", 5_000)).toBe(5_000);
    expect(signedEffect("expense", 5_000)).toBe(-5_000);
    expect(signedEffect("saving", 5_000)).toBe(-5_000);
  });
});
