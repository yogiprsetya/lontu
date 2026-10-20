import { describe, expect, it } from "vitest";
import { z } from "zod";
import { accountCreateSchema, accountUpdateSchema } from "@/lib/schemas/account";

function fieldErrors(result: { success: boolean; error?: z.ZodError }) {
  expect(result.success).toBe(false);
  return z.flattenError(result.error!).fieldErrors as Record<string, string[] | undefined>;
}

describe("accountCreateSchema", () => {
  it("trims the name and defaults initialBalance to 0 and subtype to null", () => {
    expect(accountCreateSchema.parse({ name: "  BCA ", type: "transaction" })).toEqual({
      name: "BCA",
      type: "transaction",
      subtype: null,
      initialBalance: 0,
    });
  });

  it("accepts a negative initial balance and any subtype with any type", () => {
    const parsed = accountCreateSchema.parse({ name: "Kartu", type: "asset", subtype: "credit_card", initialBalance: -500_000 });
    expect(parsed.initialBalance).toBe(-500_000);
  });

  it.each([1.5, "100", 1e12 + 1, -1e12 - 1])("rejects initialBalance %j", (initialBalance) => {
    const errors = fieldErrors(accountCreateSchema.safeParse({ name: "BCA", type: "transaction", initialBalance }));
    expect(errors.initialBalance).toBeDefined();
  });

  it.each(["", "   ", "x".repeat(51)])("rejects name %j", (name) => {
    expect(fieldErrors(accountCreateSchema.safeParse({ name, type: "transaction" })).name).toBeDefined();
  });

  it("accepts a 50-character name", () => {
    expect(accountCreateSchema.safeParse({ name: "x".repeat(50), type: "asset" }).success).toBe(true);
  });

  it("rejects an unknown type or subtype", () => {
    const errors = fieldErrors(accountCreateSchema.safeParse({ name: "BCA", type: "cash", subtype: "gold" }));
    expect(Object.keys(errors).sort()).toEqual(["subtype", "type"]);
  });

  it("drops unknown keys such as userId", () => {
    expect(accountCreateSchema.parse({ name: "BCA", type: "asset", userId: "other" })).not.toHaveProperty("userId");
  });
});

describe("accountUpdateSchema", () => {
  it("accepts a subset of fields without filling defaults", () => {
    expect(accountUpdateSchema.parse({ initialBalance: 150_000 })).toEqual({ initialBalance: 150_000 });
  });

  it("allows clearing the subtype", () => {
    expect(accountUpdateSchema.parse({ subtype: null })).toEqual({ subtype: null });
  });

  it("rejects an empty body", () => {
    expect(accountUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a body with only unknown keys", () => {
    expect(accountUpdateSchema.safeParse({ userId: "x" }).success).toBe(false);
  });
});
