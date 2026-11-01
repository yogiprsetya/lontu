import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { accountCreateSchema } from "@/lib/schemas/account";
import { valuationSchema } from "@/lib/schemas/valuation";

const emas = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const reksadana = "3a4b5c6d-7e8f-4a0b-9c2d-3e4f5a6b7c8d";

afterEach(() => {
  vi.useRealTimers();
});

const fieldsOf = (body: unknown) => {
  const result = valuationSchema.safeParse(body);
  return result.success ? undefined : Object.keys(z.flattenError(result.error).fieldErrors);
};

describe("valuationSchema", () => {
  const body = {
    date: "2026-10-31",
    items: [
      { accountId: emas, value: 36_500_000 },
      { accountId: reksadana, value: 0 },
    ],
  };

  it("accepts a valid check-in, a zero value included", () => {
    expect(valuationSchema.parse(body)).toEqual(body);
  });

  it("rejects a date after today in Jakarta", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 17:30 UTC on 31 October is already 1 November in Jakarta.
    vi.setSystemTime(new Date("2026-10-31T17:30:00Z"));
    expect(valuationSchema.safeParse({ ...body, date: "2026-11-01" }).success).toBe(true);
    expect(fieldsOf({ ...body, date: "2026-11-02" })).toEqual(["date"]);
  });

  it.each(["1999-12-31", "2026-02-30", "31-10-2026"])("rejects date %j", (date) => {
    expect(fieldsOf({ ...body, date })).toEqual(["date"]);
  });

  it.each([
    ["negative", -1],
    ["above 1e12", 1e12 + 1],
    ["fractional", 1.5],
  ])("rejects a %s value", (_, value) => {
    expect(fieldsOf({ ...body, items: [{ accountId: emas, value }] })).toEqual(["items"]);
  });

  it("rejects an empty list, more than 50 items, and a repeated account", () => {
    expect(fieldsOf({ ...body, items: [] })).toEqual(["items"]);
    const many = Array.from({ length: 51 }, () => ({ accountId: crypto.randomUUID(), value: 1 }));
    expect(fieldsOf({ ...body, items: many })).toEqual(["items"]);
    expect(
      fieldsOf({
        ...body,
        items: [
          { accountId: emas, value: 1 },
          { accountId: emas, value: 2 },
        ],
      }),
    ).toEqual(["items"]);
  });

  it("rejects unknown fields, userId and amount included", () => {
    expect(valuationSchema.safeParse({ ...body, userId: "x" }).success).toBe(false);
    expect(
      valuationSchema.safeParse({ ...body, items: [{ accountId: emas, value: 1, amount: 1 }] })
        .success,
    ).toBe(false);
  });
});

describe("account subtype gold", () => {
  it("is accepted", () => {
    expect(
      accountCreateSchema.parse({ name: "Emas", type: "asset", subtype: "gold" }).subtype,
    ).toBe("gold");
  });
});
