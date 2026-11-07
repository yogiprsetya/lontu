import { describe, expect, it } from "vitest";
import { netWorthProjection } from "@/lib/net-worth-projection";

const base = {
  targetAmount: 150_000_000,
  targetMonth: "2028-12",
  current: 42_700_000,
  monthlyFlows: [3_000_000, 4_000_000, 5_000_000],
  countedMonths: 3,
  today: "2026-11-15",
};

describe("netWorthProjection", () => {
  it("projects the SPEC-net-worth base scenario", () => {
    expect(netWorthProjection(base)).toEqual({
      remaining: 107_300_000,
      reached: false,
      monthlyContribution: 4_000_000,
      etaMonth: "2029-01",
      monthsLeft: 26,
      neededPerMonth: 4_126_924,
      overdue: false,
      onTrack: false,
    });
  });

  it("is on track when the ETA is on or before the target month", () => {
    const projection = netWorthProjection({ ...base, targetMonth: "2029-01" });
    expect(projection).toMatchObject({ etaMonth: "2029-01", monthsLeft: 27, onTrack: true });
  });

  it("is reached when current meets the target, with nothing left to project", () => {
    expect(netWorthProjection({ ...base, current: 150_000_001 })).toEqual({
      remaining: 0,
      reached: true,
      monthlyContribution: 4_000_000,
      etaMonth: null,
      monthsLeft: 26,
      neededPerMonth: null,
      overdue: false,
      onTrack: null,
    });
  });

  it("has no rate and no ETA without a full month", () => {
    expect(netWorthProjection({ ...base, monthlyFlows: [], countedMonths: 0 })).toMatchObject({
      monthlyContribution: null,
      etaMonth: null,
      onTrack: null,
      neededPerMonth: 4_126_924,
    });
  });

  it.each([
    ["zero", [0, 0, 0], 0],
    ["negative", [1_000_000, -4_000_000, 0], -1_000_000],
  ])("has no ETA when the rate is %s", (_, monthlyFlows, rate) => {
    expect(netWorthProjection({ ...base, monthlyFlows })).toMatchObject({
      monthlyContribution: rate,
      etaMonth: null,
      onTrack: null,
    });
  });

  it("divides by the counted months only", () => {
    expect(
      netWorthProjection({ ...base, monthlyFlows: [5_000_000], countedMonths: 1 })
        .monthlyContribution,
    ).toBe(5_000_000);
    expect(
      netWorthProjection({ ...base, monthlyFlows: [3_000_000, 4_000_001], countedMonths: 2 })
        .monthlyContribution,
    ).toBe(3_500_000);
  });

  it("reaches the net worth this month when the remainder is at most one month's rate", () => {
    expect(netWorthProjection({ ...base, current: 146_000_000 }).etaMonth).toBe("2026-11");
    expect(netWorthProjection({ ...base, current: 145_999_999 }).etaMonth).toBe("2026-12");
  });

  it("crosses year boundaries in both month counts", () => {
    const projection = netWorthProjection({
      ...base,
      targetMonth: "2027-01",
      current: 140_000_000,
      today: "2026-12-31",
    });
    expect(projection).toMatchObject({
      monthsLeft: 2,
      neededPerMonth: 5_000_000,
      etaMonth: "2027-02",
      onTrack: false,
    });
  });

  it("is overdue once the target month has passed, needing the whole remainder now", () => {
    expect(netWorthProjection({ ...base, targetMonth: "2026-10" })).toMatchObject({
      overdue: true,
      monthsLeft: 0,
      neededPerMonth: 107_300_000,
      onTrack: false,
    });
  });

  it("the current month as target is not overdue and leaves one month", () => {
    expect(netWorthProjection({ ...base, targetMonth: "2026-11" })).toMatchObject({
      overdue: false,
      monthsLeft: 1,
      neededPerMonth: 107_300_000,
    });
  });

  it("has no month figures without a target month", () => {
    expect(netWorthProjection({ ...base, targetMonth: null })).toMatchObject({
      monthsLeft: null,
      neededPerMonth: null,
      overdue: false,
      onTrack: null,
      etaMonth: "2029-01",
    });
  });

  it("rounds neededPerMonth up to the next rupiah", () => {
    expect(
      netWorthProjection({ ...base, current: 0, targetAmount: 10, targetMonth: "2027-01" })
        .neededPerMonth,
    ).toBe(4);
  });
});
