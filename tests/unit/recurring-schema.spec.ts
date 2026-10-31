import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  recurringAdvanceSchema,
  recurringCreateSchema,
  recurringUpdateSchema,
} from "@/lib/schemas/recurring";

const accountId = "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f";
const categoryId = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const txId = "3a4b5c6d-7e8f-4a0b-9c2d-3e4f5a6b7c8d";

function errors(result: { success: boolean; error?: z.ZodError }) {
  expect(result.success).toBe(false);
  return z.flattenError(result.error!) as {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}

function rule(overrides: Record<string, unknown> = {}) {
  return {
    type: "expense",
    name: "Netflix",
    amount: 186_000,
    accountId,
    categoryId,
    dayOfMonth: 5,
    ...overrides,
  };
}

function post(overrides: Record<string, unknown> = {}) {
  return {
    action: "post",
    occurrenceDate: "2026-10-05",
    id: txId,
    amount: 186_000,
    date: "2026-10-05",
    accountId,
    categoryId,
    description: "Netflix",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T03:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recurringCreateSchema", () => {
  it("trims the name and defaults isPayday to false", () => {
    expect(recurringCreateSchema.parse(rule({ name: "  Netflix " }))).toEqual({
      ...rule(),
      isPayday: false,
    });
  });

  it("accepts isPayday on an income rule", () => {
    expect(recurringCreateSchema.parse(rule({ type: "income", isPayday: true })).isPayday).toBe(
      true,
    );
  });

  it.each(["", "   ", "x".repeat(61)])("rejects name %j", (name) => {
    expect(errors(recurringCreateSchema.safeParse(rule({ name }))).fieldErrors.name).toBeDefined();
  });

  it.each([0, -1, 1.5, "100", 1e12 + 1])("rejects amount %j", (amount) => {
    expect(
      errors(recurringCreateSchema.safeParse(rule({ amount }))).fieldErrors.amount,
    ).toBeDefined();
  });

  it.each([0, 32, 2.5])("rejects dayOfMonth %j", (dayOfMonth) => {
    expect(
      errors(recurringCreateSchema.safeParse(rule({ dayOfMonth }))).fieldErrors.dayOfMonth,
    ).toBeDefined();
  });

  it.each(["transfer", "adjustment", "refund"])("rejects type %j", (type) => {
    expect(errors(recurringCreateSchema.safeParse(rule({ type }))).fieldErrors.type).toBeDefined();
  });

  it.each(["expense", "saving"])("rejects isPayday on a %s rule", (type) => {
    expect(
      errors(recurringCreateSchema.safeParse(rule({ type, isPayday: true }))).fieldErrors.isPayday,
    ).toBeDefined();
  });

  it.each([{ userId: "someone" }, { nextDueDate: "2026-11-05" }])(
    "rejects unknown field %j",
    (extra) => {
      expect(recurringCreateSchema.safeParse(rule(extra)).success).toBe(false);
    },
  );

  it("rejects ids that are not uuids", () => {
    const { fieldErrors } = errors(
      recurringCreateSchema.safeParse(rule({ accountId: "x", categoryId: "y" })),
    );
    expect(fieldErrors.accountId).toBeDefined();
    expect(fieldErrors.categoryId).toBeDefined();
  });
});

describe("recurringUpdateSchema", () => {
  it("accepts a subset of fields", () => {
    expect(recurringUpdateSchema.parse({ amount: 200_000 })).toEqual({ amount: 200_000 });
  });

  it("rejects type and an empty body", () => {
    expect(recurringUpdateSchema.safeParse({ type: "income" }).success).toBe(false);
    expect(recurringUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects nextDueDate and userId", () => {
    expect(recurringUpdateSchema.safeParse({ nextDueDate: "2026-11-05" }).success).toBe(false);
    expect(recurringUpdateSchema.safeParse({ userId: "x" }).success).toBe(false);
  });

  it.each([0, 32])("rejects dayOfMonth %j", (dayOfMonth) => {
    expect(
      errors(recurringUpdateSchema.safeParse({ dayOfMonth })).fieldErrors.dayOfMonth,
    ).toBeDefined();
  });
});

describe("recurringAdvanceSchema", () => {
  it("accepts a skip", () => {
    expect(recurringAdvanceSchema.parse({ action: "skip", occurrenceDate: "2026-11-05" })).toEqual({
      action: "skip",
      occurrenceDate: "2026-11-05",
    });
  });

  it("accepts a post and normalizes an empty description to null", () => {
    expect(recurringAdvanceSchema.parse(post({ description: "  " }))).toEqual(
      post({ description: null }),
    );
  });

  it("allows a future occurrenceDate but not a future transaction date", () => {
    expect(recurringAdvanceSchema.safeParse(post({ occurrenceDate: "2026-11-05" })).success).toBe(
      true,
    );
    expect(
      errors(recurringAdvanceSchema.safeParse(post({ date: "2026-10-28" }))).fieldErrors.date,
    ).toBeDefined();
  });

  it.each(["2026-02-30", "05-10-2026", ""])("rejects occurrenceDate %j", (occurrenceDate) => {
    expect(
      errors(recurringAdvanceSchema.safeParse(post({ occurrenceDate }))).fieldErrors.occurrenceDate,
    ).toBeDefined();
    expect(
      errors(recurringAdvanceSchema.safeParse({ action: "skip", occurrenceDate })).fieldErrors
        .occurrenceDate,
    ).toBeDefined();
  });

  it.each(["2026-02-30", "1999-12-31"])("rejects date %j", (date) => {
    expect(errors(recurringAdvanceSchema.safeParse(post({ date }))).fieldErrors.date).toBeDefined();
  });

  it("flattens post errors onto top-level fields", () => {
    const { fieldErrors } = errors(
      recurringAdvanceSchema.safeParse(post({ amount: 0, id: "x", categoryId: "y" })),
    );
    expect(fieldErrors.amount).toBeDefined();
    expect(fieldErrors.id).toBeDefined();
    expect(fieldErrors.categoryId).toBeDefined();
  });

  it("rejects an unknown action and extra fields", () => {
    expect(
      recurringAdvanceSchema.safeParse({ action: "undo", occurrenceDate: "2026-11-05" }).success,
    ).toBe(false);
    expect(
      recurringAdvanceSchema.safeParse({
        action: "skip",
        occurrenceDate: "2026-11-05",
        type: "income",
      }).success,
    ).toBe(false);
  });

  it("requires the transaction id on a post", () => {
    expect(
      errors(recurringAdvanceSchema.safeParse(post({ id: undefined }))).fieldErrors.id,
    ).toBeDefined();
  });
});
