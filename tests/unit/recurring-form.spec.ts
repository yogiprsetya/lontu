import { describe, expect, it } from "vitest";
import { paydayHint, reschedulesMissed, ruleFormDefaults, toUpdateInput } from "@/lib/recurring-form";
import type { RecurringRule } from "@/lib/schemas/recurring";

const rule: RecurringRule = {
  id: "r1",
  type: "expense",
  name: "Netflix",
  amount: 186_000,
  accountId: "a1",
  categoryId: "c1",
  dayOfMonth: 5,
  nextDueDate: "2026-10-05",
  isPayday: false,
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("ruleFormDefaults", () => {
  it("starts an empty expense rule on day 1", () => {
    expect(ruleFormDefaults({})).toEqual({
      type: "expense",
      name: "",
      amount: 0,
      accountId: "",
      categoryId: "",
      dayOfMonth: 1,
      isPayday: false,
    });
  });

  it("applies a preset such as Tambah gaji", () => {
    expect(ruleFormDefaults({ preset: { type: "income", isPayday: true } })).toMatchObject({ type: "income", isPayday: true });
  });

  it("copies an existing rule", () => {
    expect(ruleFormDefaults({ rule })).toEqual({
      type: "expense",
      name: "Netflix",
      amount: 186_000,
      accountId: "a1",
      categoryId: "c1",
      dayOfMonth: 5,
      isPayday: false,
    });
  });
});

describe("toUpdateInput", () => {
  it("drops type, which is never editable", () => {
    expect(toUpdateInput({ ...ruleFormDefaults({ rule }), isPayday: false })).not.toHaveProperty("type");
  });
});

describe("paydayHint", () => {
  const payday = { ...rule, id: "p1", type: "income" as const, name: "Gaji", isPayday: true };

  it("names the rule that will lose the payday flag", () => {
    expect(paydayHint(true, payday, "r2")).toBe("Menggantikan Gaji sebagai gajian.");
  });

  it("says nothing when unchecked, when there is no payday, or when editing the payday itself", () => {
    expect(paydayHint(false, payday, "r2")).toBeUndefined();
    expect(paydayHint(true, undefined, "r2")).toBeUndefined();
    expect(paydayHint(true, payday, "p1")).toBeUndefined();
  });
});

describe("reschedulesMissed", () => {
  it("warns when a late rule gets a new day", () => {
    expect(reschedulesMissed(rule, 10, "2026-10-27")).toBe(true);
  });

  it("does not warn when the day is unchanged or the rule is not late", () => {
    expect(reschedulesMissed(rule, 5, "2026-10-27")).toBe(false);
    expect(reschedulesMissed({ ...rule, nextDueDate: "2026-11-05" }, 10, "2026-10-27")).toBe(false);
    expect(reschedulesMissed(undefined, 10, "2026-10-27")).toBe(false);
  });
});
