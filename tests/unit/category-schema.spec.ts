import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CATEGORY_KIND_FOR,
  categoryCreateSchema,
  categoryRenameSchema,
} from "@/lib/schemas/category";

function fieldErrors(result: { success: boolean; error?: z.ZodError }) {
  expect(result.success).toBe(false);
  return z.flattenError(result.error!).fieldErrors as Record<string, string[] | undefined>;
}

describe("categoryCreateSchema", () => {
  it("accepts a spending category with a spendingType", () => {
    expect(
      categoryCreateSchema.parse({ name: " Parkir ", kind: "spending", spendingType: "needs" }),
    ).toEqual({
      name: "Parkir",
      kind: "spending",
      spendingType: "needs",
    });
  });

  it("normalises a missing spendingType to null for income and saving", () => {
    expect(categoryCreateSchema.parse({ name: "Freelance", kind: "income" })).toEqual({
      name: "Freelance",
      kind: "income",
      spendingType: null,
    });
    expect(
      categoryCreateSchema.parse({ name: "Haji", kind: "saving", spendingType: null }).spendingType,
    ).toBeNull();
  });

  it("requires a spendingType for spending", () => {
    const errors = fieldErrors(
      categoryCreateSchema.safeParse({ name: "Parkir", kind: "spending" }),
    );
    expect(errors.spendingType?.[0]).toMatch(/needs|wants/i);
  });

  it("rejects a spendingType on income", () => {
    const errors = fieldErrors(
      categoryCreateSchema.safeParse({ name: "Gaji", kind: "income", spendingType: "wants" }),
    );
    expect(errors.spendingType).toBeDefined();
  });

  it("rejects an unknown kind under fields.kind", () => {
    const errors = fieldErrors(categoryCreateSchema.safeParse({ name: "X", kind: "expense" }));
    expect(errors.kind?.[0]).toBe("Jenis kategori tidak valid");
  });

  it.each(["", "x".repeat(51)])("rejects name %j", (name) => {
    expect(
      fieldErrors(categoryCreateSchema.safeParse({ name, kind: "income" })).name,
    ).toBeDefined();
  });
});

describe("categoryRenameSchema", () => {
  it("accepts only a name", () => {
    expect(categoryRenameSchema.parse({ name: " Makan Siang " })).toEqual({ name: "Makan Siang" });
  });

  it.each([
    { name: "X", kind: "income" },
    { name: "X", spendingType: "wants" },
    { kind: "income" },
  ])("rejects %j", (body) => {
    expect(categoryRenameSchema.safeParse(body).success).toBe(false);
  });
});

describe("CATEGORY_KIND_FOR", () => {
  it("maps transaction types to category kinds", () => {
    expect(CATEGORY_KIND_FOR).toEqual({ income: "income", saving: "saving", expense: "spending" });
  });
});
