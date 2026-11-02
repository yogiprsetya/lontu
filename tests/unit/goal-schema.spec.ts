import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { goalCreateSchema, goalEditSchema, goalUpdateSchema } from "@/lib/schemas/goal";

const emas = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const reksadana = "3a4b5c6d-7e8f-4a0b-9c2d-3e4f5a6b7c8d";

afterEach(() => {
  vi.useRealTimers();
});

function fieldsOf(schema: z.ZodType, body: unknown) {
  const result = schema.safeParse(body);
  if (result.success) return undefined;
  const { formErrors, fieldErrors } = z.flattenError(result.error);
  return formErrors.length > 0 ? ["(form)"] : Object.keys(fieldErrors).sort();
}

describe("goalCreateSchema", () => {
  const body = {
    name: " DP Rumah ",
    targetAmount: 150_000_000,
    targetMonth: "2028-12",
    accountIds: [emas, reksadana],
  };

  it("accepts a valid body, trimming the name and keeping the account order", () => {
    expect(goalCreateSchema.parse(body)).toEqual({ ...body, name: "DP Rumah" });
  });

  it("defaults a missing targetMonth to null, and takes null", () => {
    const rest: Partial<typeof body> = { ...body };
    delete rest.targetMonth;
    expect(goalCreateSchema.parse(rest).targetMonth).toBeNull();
    expect(goalCreateSchema.parse({ ...body, targetMonth: null }).targetMonth).toBeNull();
  });

  it("takes the current month in Jakarta but not the one before", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 17:30 UTC on 31 October is already 1 November in Jakarta.
    vi.setSystemTime(new Date("2026-10-31T17:30:00Z"));
    expect(fieldsOf(goalCreateSchema, { ...body, targetMonth: "2026-11" })).toBeUndefined();
    expect(fieldsOf(goalCreateSchema, { ...body, targetMonth: "2026-10" })).toEqual([
      "targetMonth",
    ]);
  });

  it.each(["2028-13", "2028-1", "28-12", "2028-12-01", "1999-12"])(
    "rejects targetMonth %j",
    (targetMonth) => {
      expect(fieldsOf(goalCreateSchema, { ...body, targetMonth })).toEqual(["targetMonth"]);
    },
  );

  it.each([
    ["an empty name", { name: "  " }, "name"],
    ["a 61-character name", { name: "a".repeat(61) }, "name"],
    ["a zero amount", { targetAmount: 0 }, "targetAmount"],
    ["an amount above 1e12", { targetAmount: 1e12 + 1 }, "targetAmount"],
    ["a fractional amount", { targetAmount: 1.5 }, "targetAmount"],
    ["no accounts", { accountIds: [] }, "accountIds"],
    ["a repeated account", { accountIds: [emas, emas] }, "accountIds"],
    ["a non-UUID account", { accountIds: ["emas"] }, "accountIds"],
    [
      "21 accounts",
      { accountIds: Array.from({ length: 21 }, () => crypto.randomUUID()) },
      "accountIds",
    ],
  ])("rejects %s", (_, patch, field) => {
    expect(fieldsOf(goalCreateSchema, { ...body, ...patch })).toEqual([field]);
  });

  it("rejects unknown fields such as userId", () => {
    expect(goalCreateSchema.safeParse({ ...body, userId: "x" }).success).toBe(false);
  });
});

describe("goalUpdateSchema", () => {
  it("takes any subset of the create fields", () => {
    expect(goalUpdateSchema.parse({ name: "Rumah" })).toEqual({ name: "Rumah" });
    expect(goalUpdateSchema.parse({ targetMonth: null })).toEqual({ targetMonth: null });
  });

  it("rejects an empty body, unknown fields, and a past target month", () => {
    expect(fieldsOf(goalUpdateSchema, {})).toEqual(["(form)"]);
    expect(goalUpdateSchema.safeParse({ archivedAt: null }).success).toBe(false);
    expect(fieldsOf(goalUpdateSchema, { targetMonth: "2000-01" })).toEqual(["targetMonth"]);
  });
});

describe("goalEditSchema", () => {
  const body = { name: "DP", targetAmount: 1, accountIds: [emas] };

  it("keeps the goal's own past target month, but no other past month", () => {
    const schema = goalEditSchema("2000-01");
    expect(schema.safeParse({ ...body, targetMonth: "2000-01" }).success).toBe(true);
    expect(fieldsOf(schema, { ...body, targetMonth: "2000-02" })).toEqual(["targetMonth"]);
  });

  it("behaves like the create schema without a stored month", () => {
    expect(fieldsOf(goalEditSchema(null), { ...body, targetMonth: "2000-01" })).toEqual([
      "targetMonth",
    ]);
  });
});
