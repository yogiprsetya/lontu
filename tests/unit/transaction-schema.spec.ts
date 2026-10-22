import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { transactionCreateSchema } from "@/lib/schemas/transaction";

const accountId = "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f";
const categoryId = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const toAccountId = "3a4b5c6d-7e8f-4a0b-9c2d-3e4f5a6b7c8d";

function fieldErrors(result: { success: boolean; error?: z.ZodError }) {
  expect(result.success).toBe(false);
  return z.flattenError(result.error!) as { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> };
}

function transfer(overrides: Record<string, unknown> = {}) {
  return { type: "transfer", amount: 10_000, date: "2026-10-21", accountId, toAccountId, ...overrides };
}

function expense(overrides: Record<string, unknown> = {}) {
  return { type: "expense", amount: 25_000, date: "2026-10-21", accountId, categoryId, ...overrides };
}

beforeEach(() => {
  // 00:30 on 22 Oct in Jakarta, still 21 Oct in UTC.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-21T17:30:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("transactionCreateSchema", () => {
  it.each(["income", "expense", "saving"])("accepts a %s and defaults description to null", (type) => {
    expect(transactionCreateSchema.parse(expense({ type }))).toEqual({
      type,
      amount: 25_000,
      date: "2026-10-21",
      accountId,
      categoryId,
      description: null,
    });
  });

  it("trims the description and turns an empty one into null", () => {
    expect(transactionCreateSchema.parse(expense({ description: "  Makan siang  " })).description).toBe("Makan siang");
    expect(transactionCreateSchema.parse(expense({ description: "   " })).description).toBeNull();
    expect(transactionCreateSchema.parse(expense({ description: null })).description).toBeNull();
  });

  it("rejects a description over 200 characters", () => {
    expect(fieldErrors(transactionCreateSchema.safeParse(expense({ description: "x".repeat(201) }))).fieldErrors.description).toBeDefined();
    expect(transactionCreateSchema.safeParse(expense({ description: "x".repeat(200) })).success).toBe(true);
  });

  it.each([0, -1, 1.5, "100", 1e12 + 1, null])("rejects amount %j", (amount) => {
    expect(fieldErrors(transactionCreateSchema.safeParse(expense({ amount }))).fieldErrors.amount).toBeDefined();
  });

  it("accepts the amount bounds 1 and 1e12", () => {
    expect(transactionCreateSchema.safeParse(expense({ amount: 1 })).success).toBe(true);
    expect(transactionCreateSchema.safeParse(expense({ amount: 1e12 })).success).toBe(true);
  });

  it.each(["21-10-2026", "2026-02-30", "", "1999-12-31", "2026-10-23"])("rejects date %j", (date) => {
    expect(fieldErrors(transactionCreateSchema.safeParse(expense({ date }))).fieldErrors.date).toBeDefined();
  });

  it("accepts 2000-01-01 and today in Jakarta, which is already tomorrow in UTC", () => {
    expect(transactionCreateSchema.safeParse(expense({ date: "2000-01-01" })).success).toBe(true);
    expect(transactionCreateSchema.safeParse(expense({ date: "2026-10-22" })).success).toBe(true);
  });

  it.each(["adjustment", "refund", undefined])("rejects type %j under fields.type", (type) => {
    expect(fieldErrors(transactionCreateSchema.safeParse(expense({ type }))).fieldErrors.type).toBeDefined();
  });

  it.each([{ userId: "test-x" }, { fee: { amount: 1000, categoryId } }, { toAccountId: accountId }])(
    "rejects unknown field %j",
    (extra) => {
      expect(fieldErrors(transactionCreateSchema.safeParse(expense(extra))).formErrors[0]).toMatch(/Unrecognized key/);
    },
  );

  it("requires a categoryId and an accountId that are UUIDs", () => {
    const missing = fieldErrors(transactionCreateSchema.safeParse(expense({ categoryId: undefined, accountId: "1" })));
    expect(missing.fieldErrors.categoryId).toBeDefined();
    expect(missing.fieldErrors.accountId).toBeDefined();
  });
});

describe("transactionCreateSchema transfer", () => {
  it("accepts a transfer without a fee", () => {
    expect(transactionCreateSchema.parse(transfer())).toEqual({
      type: "transfer",
      amount: 10_000,
      date: "2026-10-21",
      accountId,
      toAccountId,
      description: null,
    });
  });

  it("accepts a transfer with a fee", () => {
    expect(transactionCreateSchema.parse(transfer({ fee: { amount: 2_500, categoryId } }))).toMatchObject({
      fee: { amount: 2_500, categoryId },
    });
  });

  it("rejects the same source and destination account under fields.toAccountId", () => {
    const errors = fieldErrors(transactionCreateSchema.safeParse(transfer({ toAccountId: accountId })));
    expect(errors.fieldErrors.toAccountId).toEqual(["Akun tujuan harus berbeda"]);
  });

  it("requires toAccountId", () => {
    expect(fieldErrors(transactionCreateSchema.safeParse(transfer({ toAccountId: undefined }))).fieldErrors.toAccountId).toBeDefined();
  });

  it.each([{ amount: 0, categoryId }, { amount: 1.5, categoryId }, { amount: 2_500 }, { amount: 2_500, categoryId, extra: 1 }])(
    "reports an invalid fee %j under fields.fee",
    (fee) => {
      expect(fieldErrors(transactionCreateSchema.safeParse(transfer({ fee }))).fieldErrors.fee).toBeDefined();
    },
  );

  it("rejects a categoryId on a transfer", () => {
    expect(transactionCreateSchema.safeParse(transfer({ categoryId })).success).toBe(false);
  });
});
