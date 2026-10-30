import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { transactionCreateSchema, transactionUpdateSchema } from "@/lib/schemas/transaction";

const accountId = "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f";
const categoryId = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const toAccountId = "3a4b5c6d-7e8f-4a0b-9c2d-3e4f5a6b7c8d";

function fieldErrors(result: { success: boolean; error?: z.ZodError }) {
  expect(result.success).toBe(false);
  return z.flattenError(result.error!) as {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}

function transfer(overrides: Record<string, unknown> = {}) {
  return {
    type: "transfer",
    amount: 10_000,
    date: "2026-10-21",
    accountId,
    toAccountId,
    ...overrides,
  };
}

function expense(overrides: Record<string, unknown> = {}) {
  return {
    type: "expense",
    amount: 25_000,
    date: "2026-10-21",
    accountId,
    categoryId,
    ...overrides,
  };
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
  it.each(["income", "expense", "saving"])(
    "accepts a %s and defaults description to null",
    (type) => {
      expect(transactionCreateSchema.parse(expense({ type }))).toEqual({
        type,
        amount: 25_000,
        date: "2026-10-21",
        accountId,
        categoryId,
        description: null,
      });
    },
  );

  it("trims the description and turns an empty one into null", () => {
    expect(
      transactionCreateSchema.parse(expense({ description: "  Makan siang  " })).description,
    ).toBe("Makan siang");
    expect(transactionCreateSchema.parse(expense({ description: "   " })).description).toBeNull();
    expect(transactionCreateSchema.parse(expense({ description: null })).description).toBeNull();
  });

  it("rejects a description over 200 characters", () => {
    expect(
      fieldErrors(transactionCreateSchema.safeParse(expense({ description: "x".repeat(201) })))
        .fieldErrors.description,
    ).toBeDefined();
    expect(
      transactionCreateSchema.safeParse(expense({ description: "x".repeat(200) })).success,
    ).toBe(true);
  });

  it.each([0, -1, 1.5, "100", 1e12 + 1, null])("rejects amount %j", (amount) => {
    expect(
      fieldErrors(transactionCreateSchema.safeParse(expense({ amount }))).fieldErrors.amount,
    ).toBeDefined();
  });

  it("accepts the amount bounds 1 and 1e12", () => {
    expect(transactionCreateSchema.safeParse(expense({ amount: 1 })).success).toBe(true);
    expect(transactionCreateSchema.safeParse(expense({ amount: 1e12 })).success).toBe(true);
  });

  it.each(["21-10-2026", "2026-02-30", "", "1999-12-31", "2026-10-23"])(
    "rejects date %j",
    (date) => {
      expect(
        fieldErrors(transactionCreateSchema.safeParse(expense({ date }))).fieldErrors.date,
      ).toBeDefined();
    },
  );

  it("accepts 2000-01-01 and today in Jakarta, which is already tomorrow in UTC", () => {
    expect(transactionCreateSchema.safeParse(expense({ date: "2000-01-01" })).success).toBe(true);
    expect(transactionCreateSchema.safeParse(expense({ date: "2026-10-22" })).success).toBe(true);
  });

  it.each(["adjustment", "refund", undefined])("rejects type %j under fields.type", (type) => {
    expect(
      fieldErrors(transactionCreateSchema.safeParse(expense({ type }))).fieldErrors.type,
    ).toBeDefined();
  });

  it.each([
    { userId: "test-x" },
    { fee: { amount: 1000, categoryId } },
    { toAccountId: accountId },
  ])("rejects unknown field %j", (extra) => {
    expect(fieldErrors(transactionCreateSchema.safeParse(expense(extra))).formErrors[0]).toMatch(
      /Unrecognized key/,
    );
  });

  it("requires a categoryId and an accountId that are UUIDs", () => {
    const missing = fieldErrors(
      transactionCreateSchema.safeParse(expense({ categoryId: undefined, accountId: "1" })),
    );
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
    expect(
      transactionCreateSchema.parse(transfer({ fee: { amount: 2_500, categoryId } })),
    ).toMatchObject({
      fee: { amount: 2_500, categoryId },
    });
  });

  it("rejects the same source and destination account under fields.toAccountId", () => {
    const errors = fieldErrors(
      transactionCreateSchema.safeParse(transfer({ toAccountId: accountId })),
    );
    expect(errors.fieldErrors.toAccountId).toEqual(["Akun tujuan harus berbeda"]);
  });

  it("requires toAccountId", () => {
    expect(
      fieldErrors(transactionCreateSchema.safeParse(transfer({ toAccountId: undefined })))
        .fieldErrors.toAccountId,
    ).toBeDefined();
  });

  it.each([
    { amount: 0, categoryId },
    { amount: 1.5, categoryId },
    { amount: 2_500 },
    { amount: 2_500, categoryId, extra: 1 },
  ])("reports an invalid fee %j under fields.fee", (fee) => {
    expect(
      fieldErrors(transactionCreateSchema.safeParse(transfer({ fee }))).fieldErrors.fee,
    ).toBeDefined();
  });

  it("rejects a categoryId on a transfer", () => {
    expect(transactionCreateSchema.safeParse(transfer({ categoryId })).success).toBe(false);
  });
});

describe("transactionUpdateSchema", () => {
  it.each(["income", "expense", "saving"] as const)("accepts a partial %s update", (type) => {
    const schema = transactionUpdateSchema(type);
    expect(schema.parse({ amount: 40_000 })).toEqual({ amount: 40_000 });
    expect(schema.parse({ categoryId, accountId, date: "2026-10-01" })).toEqual({
      categoryId,
      accountId,
      date: "2026-10-01",
    });
  });

  it("accepts a partial transfer update including toAccountId", () => {
    expect(transactionUpdateSchema("transfer").parse({ toAccountId })).toEqual({ toAccountId });
  });

  it("rejects an empty body", () => {
    expect(transactionUpdateSchema("expense").safeParse({}).success).toBe(false);
  });

  it.each([
    ["expense", { type: "income" }],
    ["expense", { userId: "x" }],
    ["expense", { fee: { amount: 1, categoryId } }],
    ["expense", { toAccountId }],
    ["income", { toAccountId }],
    ["transfer", { categoryId }],
    ["transfer", { fee: { amount: 1, categoryId } }],
    ["transfer", { type: "transfer" }],
  ] as const)("rejects fields outside the stored type: %s %j", (type, body) => {
    expect(transactionUpdateSchema(type).safeParse(body).success).toBe(false);
  });

  it("clears the description with null or an empty string", () => {
    expect(transactionUpdateSchema("expense").parse({ description: null })).toEqual({
      description: null,
    });
    expect(transactionUpdateSchema("expense").parse({ description: "  " })).toEqual({
      description: null,
    });
  });

  it("does not add a description when it is absent", () => {
    expect(transactionUpdateSchema("expense").parse({ amount: 5 })).not.toHaveProperty(
      "description",
    );
  });

  it("applies the create rules to amount and date", () => {
    expect(
      fieldErrors(transactionUpdateSchema("expense").safeParse({ amount: 0 })).fieldErrors.amount,
    ).toBeDefined();
    expect(
      fieldErrors(transactionUpdateSchema("expense").safeParse({ date: "2026-10-23" })).fieldErrors
        .date,
    ).toBeDefined();
  });

  it("rejects a transfer whose destination equals its source when both are sent", () => {
    const errors = fieldErrors(
      transactionUpdateSchema("transfer").safeParse({ accountId, toAccountId: accountId }),
    );
    expect(errors.fieldErrors.toAccountId).toEqual(["Akun tujuan harus berbeda"]);
  });
});

describe("client transaction ids", () => {
  const id = "5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d8e";
  const feeId = "6c7d8e9f-0a1b-4c2d-9e3f-4a5b6c7d8e9f";

  it("keeps an optional id on simple creates", () => {
    expect(transactionCreateSchema.parse(expense({ id })).id).toBe(id);
    expect(transactionCreateSchema.parse(expense()).id).toBeUndefined();
  });

  it("rejects a non-UUID id on fields.id", () => {
    expect(
      fieldErrors(transactionCreateSchema.safeParse(expense({ id: "abc" }))).fieldErrors.id,
    ).toBeDefined();
  });

  it("keeps id and fee.id on a transfer", () => {
    const parsed = transactionCreateSchema.parse(
      transfer({ id, fee: { id: feeId, amount: 2_500, categoryId } }),
    );
    expect(parsed).toMatchObject({ id, fee: { id: feeId } });
  });

  it("rejects a fee.id equal to the transfer id on fields.fee", () => {
    const result = transactionCreateSchema.safeParse(
      transfer({ id, fee: { id, amount: 2_500, categoryId } }),
    );
    expect(fieldErrors(result).fieldErrors.fee).toBeDefined();
  });

  it("rejects id on PATCH", () => {
    expect(transactionUpdateSchema("expense").safeParse({ id, amount: 1_000 }).success).toBe(false);
    expect(transactionUpdateSchema("transfer").safeParse({ id, amount: 1_000 }).success).toBe(
      false,
    );
  });
});
