import { describe, expect, it } from "vitest";
import {
  formatTargetMonth,
  goalAccountOptions,
  goalChanges,
  goalPercent,
  goalProjectionText,
} from "@/lib/goal-format";
import type { Account } from "@/lib/schemas/account";
import type { GoalProjection } from "@/lib/schemas/goal";

const base: GoalProjection = {
  remaining: 107_300_000,
  reached: false,
  monthlyContribution: 4_000_000,
  etaMonth: "2029-01",
  monthsLeft: 26,
  neededPerMonth: 4_126_924,
  overdue: false,
  onTrack: false,
};

const text = (projection: Partial<GoalProjection>, targetMonth: string | null = "2028-12") =>
  goalProjectionText({ targetMonth, projection: { ...base, ...projection } });

describe("goalProjectionText", () => {
  it("says the goal is reached and nothing else", () => {
    expect(text({ reached: true, remaining: 0, etaMonth: null, onTrack: null })).toEqual([
      "Tercapai",
    ]);
  });

  it("gives the monthly need and how late the current rate lands", () => {
    expect(text({})).toEqual([
      "Butuh Rp4,1 jt/bulan sampai Des 2028",
      "Dengan laju sekarang: Jan 2029 (terlambat 1 bulan)",
    ]);
  });

  it("counts months late across years", () => {
    expect(text({ etaMonth: "2030-02" })[1]).toBe(
      "Dengan laju sekarang: Feb 2030 (terlambat 14 bulan)",
    );
  });

  it("says on time when the ETA is not after the target month", () => {
    expect(text({ etaMonth: "2028-10", onTrack: true })[1]).toBe(
      "Dengan laju sekarang: tepat waktu",
    );
  });

  it("says the target month has passed and what is missing", () => {
    expect(text({ overdue: true, monthsLeft: 0, neededPerMonth: 107_300_000 }, "2026-10")).toEqual([
      "Bulan target sudah lewat · kurang Rp107.300.000",
    ]);
  });

  it.each([
    [null, "Perkiraan muncul setelah satu bulan penuh"],
    [0, "Belum ada setoran 3 bulan terakhir"],
    [-500_000, "Belum ada setoran 3 bulan terakhir"],
  ])("explains a rate of %s under the monthly need", (rate, second) => {
    expect(text({ monthlyContribution: rate, etaMonth: null, onTrack: null })).toEqual([
      "Butuh Rp4,1 jt/bulan sampai Des 2028",
      second,
    ]);
  });

  it("gives the rate and ETA without a target month", () => {
    expect(text({ monthsLeft: null, neededPerMonth: null, onTrack: null }, null)).toEqual([
      "Dengan laju Rp4 jt/bulan, tercapai sekitar Jan 2029",
    ]);
  });

  it.each([
    [null, "Perkiraan muncul setelah satu bulan penuh"],
    [0, "Belum ada setoran 3 bulan terakhir"],
  ])("explains a rate of %s without a target month", (rate, line) => {
    expect(
      text(
        { monthlyContribution: rate, etaMonth: null, monthsLeft: null, neededPerMonth: null },
        null,
      ),
    ).toEqual([line]);
  });

  it("passes every amount through the screen's formatter, so hidden amounts stay hidden", () => {
    const hidden = () => "Rp•••";
    expect(goalProjectionText({ targetMonth: "2028-12", projection: base }, hidden)[0]).toBe(
      "Butuh Rp•••/bulan sampai Des 2028",
    );
  });
});

describe("goalPercent", () => {
  it("floors, and never goes below zero", () => {
    expect(goalPercent(42_700_000, 150_000_000)).toBe(28);
    expect(goalPercent(-1, 100)).toBe(0);
    expect(goalPercent(150, 100)).toBe(150);
  });
});

describe("formatTargetMonth", () => {
  it("reads a month as short month and year", () => {
    expect(formatTargetMonth("2028-12")).toBe("Des 2028");
  });
});

describe("goalAccountOptions", () => {
  const account = (id: string, patch: Partial<Account> = {}): Account => ({
    id,
    name: id.toUpperCase(),
    type: "asset",
    subtype: null,
    initialBalance: 0,
    balance: 1_000,
    archivedAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...patch,
  });
  const accounts = [
    account("bca", { type: "transaction", subtype: "debit" }),
    account("kartu", { type: "transaction", subtype: "credit_card" }),
    account("emas", { subtype: "gold" }),
    account("rd", { subtype: "investment" }),
    account("lama", { archivedAt: "2026-10-01T00:00:00.000Z" }),
  ];
  const goals = [
    { id: "g1", name: "DP Rumah", accountIds: ["emas", "lama"], archivedAt: null },
    { id: "g2", name: "Liburan", accountIds: ["rd"], archivedAt: "2026-10-01T00:00:00.000Z" },
  ];

  it("hides credit cards and archived accounts, and marks another goal's account as taken", () => {
    expect(goalAccountOptions(accounts, goals)).toEqual([
      { id: "bca", name: "BCA", balance: 1_000, takenBy: null },
      { id: "emas", name: "EMAS", balance: 1_000, takenBy: "DP Rumah" },
      { id: "rd", name: "RD", balance: 1_000, takenBy: null },
    ]);
  });

  it("frees the goal's own accounts and keeps its archived ones, labelled", () => {
    expect(goalAccountOptions(accounts, goals, goals[0])).toEqual([
      { id: "bca", name: "BCA", balance: 1_000, takenBy: null },
      { id: "emas", name: "EMAS", balance: 1_000, takenBy: null },
      { id: "rd", name: "RD", balance: 1_000, takenBy: null },
      { id: "lama", name: "LAMA (arsip)", balance: 1_000, takenBy: null },
    ]);
  });
});

describe("goalChanges", () => {
  const goal = {
    name: "DP Rumah",
    targetAmount: 150_000_000,
    targetMonth: "2028-12",
    accountIds: ["emas", "rd"],
  };

  it("is empty when nothing changed", () => {
    expect(goalChanges(goal, { ...goal, accountIds: ["emas", "rd"] })).toEqual({});
  });

  it("sends only the fields that changed, clearing the month with null", () => {
    expect(goalChanges(goal, { ...goal, name: "Rumah", targetMonth: null })).toEqual({
      name: "Rumah",
      targetMonth: null,
    });
  });

  it("treats a new account order as a change", () => {
    expect(goalChanges(goal, { ...goal, accountIds: ["rd", "emas"] })).toEqual({
      accountIds: ["rd", "emas"],
    });
  });
});
