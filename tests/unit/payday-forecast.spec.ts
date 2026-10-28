import { describe, expect, it } from "vitest";
import { paydayForecast } from "@/lib/payday-forecast";
import type { RecurringRule } from "@/lib/schemas/recurring";

function rule(overrides: Partial<RecurringRule>): RecurringRule {
  return {
    id: overrides.name ?? "r",
    type: "expense",
    name: "r",
    amount: 100_000,
    accountId: "a",
    categoryId: "c",
    dayOfMonth: 1,
    nextDueDate: "2026-12-01",
    isPayday: false,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const today = "2026-11-13";
const salary = rule({ name: "Gaji", type: "income", amount: 10_000_000, dayOfMonth: 25, nextDueDate: "2026-11-25", isPayday: true });
const netflix = rule({ name: "Netflix", amount: 186_000, dayOfMonth: 5, nextDueDate: "2026-11-05" });
const rent = rule({ name: "Sewa", amount: 2_500_000, dayOfMonth: 1, nextDueDate: "2026-12-01" });
const saving = rule({ name: "Dana darurat", type: "saving", amount: 1_000_000, dayOfMonth: 20, nextDueDate: "2026-11-20" });

describe("paydayForecast", () => {
  it("projects the spec scenario until the next payday", () => {
    expect(paydayForecast({ rules: [salary, netflix, rent, saving], spendable: 3_200_000, today })).toEqual({
      status: "ok",
      payday: "2026-11-25",
      daysLeft: 12,
      spendable: 3_200_000,
      committed: 1_186_000,
      free: 2_014_000,
      items: [
        { ruleId: "Netflix", dueDate: "2026-11-05", amount: 186_000 },
        { ruleId: "Dana darurat", dueDate: "2026-11-20", amount: 1_000_000 },
      ],
    });
  });

  it("is no_payday without an active payday rule", () => {
    expect(paydayForecast({ rules: [netflix], spendable: 0, today })).toEqual({ status: "no_payday" });
    const archived = { ...salary, archivedAt: "2026-11-01T00:00:00.000Z" };
    expect(paydayForecast({ rules: [archived, netflix], spendable: 0, today })).toEqual({ status: "no_payday" });
  });

  it.each(["2026-11-13", "2026-11-10"])("is payday_due when the payday is due on %s", (nextDueDate) => {
    expect(paydayForecast({ rules: [{ ...salary, nextDueDate }, netflix], spendable: 0, today })).toEqual({
      status: "payday_due",
      ruleId: "Gaji",
      dueDate: nextDueDate,
    });
  });

  it("leaves out an occurrence that falls on payday itself", () => {
    const onPayday = rule({ name: "Listrik", dayOfMonth: 25, nextDueDate: "2026-11-25" });
    const result = paydayForecast({ rules: [salary, onPayday], spendable: 0, today });
    expect(result.status === "ok" && result.items).toEqual([]);
  });

  it("counts every missed occurrence before payday", () => {
    const late = rule({ name: "Gym", amount: 300_000, dayOfMonth: 5, nextDueDate: "2026-08-05" });
    const result = paydayForecast({ rules: [salary, late], spendable: 0, today });
    expect(result.status === "ok" && result.items.map((i) => i.dueDate)).toEqual(["2026-08-05", "2026-09-05", "2026-10-05", "2026-11-05"]);
    expect(result.status === "ok" && result.committed).toBe(1_200_000);
  });

  it("ignores income that is not the payday, and archived rules", () => {
    const bonus = rule({ name: "Bonus", type: "income", nextDueDate: "2026-11-15" });
    const gone = { ...netflix, archivedAt: "2026-11-01T00:00:00.000Z" };
    const result = paydayForecast({ rules: [salary, bonus, gone], spendable: 500, today });
    expect(result).toMatchObject({ status: "ok", committed: 0, free: 500, items: [] });
  });

  it("goes negative when commitments exceed the balance", () => {
    expect(paydayForecast({ rules: [salary, saving], spendable: 200_000, today })).toMatchObject({ free: -800_000 });
  });

  it("orders items by date, then rule name", () => {
    const b = rule({ name: "b", dayOfMonth: 20, nextDueDate: "2026-11-20" });
    const a = rule({ name: "A", dayOfMonth: 20, nextDueDate: "2026-11-20" });
    const result = paydayForecast({ rules: [salary, b, a, netflix], spendable: 0, today });
    expect(result.status === "ok" && result.items.map((i) => i.ruleId)).toEqual(["Netflix", "A", "b"]);
  });
});
