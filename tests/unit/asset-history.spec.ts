import { describe, expect, it } from "vitest";
import { assetHistorySummary, summarySentence, withChanges } from "@/lib/asset-history";
import { displayAmount } from "@/lib/money";
import type { AssetHistory } from "@/lib/schemas/asset-history";

const zero = { value: 0, contributed: 0, marketGain: 0 };

describe("withChanges", () => {
  it("measures the first month against opening", () => {
    const opening = { value: 30_000_000, contributed: 30_000_000, marketGain: 0 };
    expect(
      withChanges(opening, [
        { month: "2026-08", value: 33_000_000, contributed: 33_000_000, marketGain: 0 },
      ]),
    ).toEqual([
      {
        month: "2026-08",
        value: 33_000_000,
        contributed: 33_000_000,
        marketGain: 0,
        contributionChange: 3_000_000,
        marketChange: 0,
      },
    ]);
  });

  it("measures each later month against the one before it, negative changes included", () => {
    const months = withChanges(zero, [
      { month: "2026-09", value: 6_700_000, contributed: 7_000_000, marketGain: -300_000 },
      { month: "2026-10", value: 5_700_000, contributed: 6_000_000, marketGain: -300_000 },
      { month: "2026-11", value: 5_900_000, contributed: 6_000_000, marketGain: -100_000 },
    ]);
    expect(months.map((m) => [m.month, m.contributionChange, m.marketChange])).toEqual([
      ["2026-09", 7_000_000, -300_000],
      ["2026-10", -1_000_000, 0],
      ["2026-11", 0, 200_000],
    ]);
  });

  it("returns no months for no points", () => {
    expect(withChanges(zero, [])).toEqual([]);
  });
});

/** SPEC-asset-history § Acceptance criteria, range 6 on 2027-01-15. */
const history: AssetHistory = {
  range: "6",
  accountId: null,
  opening: { value: 30_000_000, contributed: 30_000_000, marketGain: 0 },
  months: withChanges({ value: 30_000_000, contributed: 30_000_000, marketGain: 0 }, [
    { month: "2026-08", value: 33_000_000, contributed: 33_000_000, marketGain: 0 },
    { month: "2026-09", value: 36_700_000, contributed: 37_000_000, marketGain: -300_000 },
    { month: "2026-10", value: 42_200_000, contributed: 42_000_000, marketGain: 200_000 },
    { month: "2026-11", value: 42_400_000, contributed: 42_000_000, marketGain: 400_000 },
    { month: "2026-12", value: 42_400_000, contributed: 42_000_000, marketGain: 400_000 },
    { month: "2027-01", value: 42_400_000, contributed: 42_000_000, marketGain: 400_000 },
  ]),
};

describe("assetHistorySummary", () => {
  it("measures the last month against opening, since the first month", () => {
    expect(assetHistorySummary(history)).toEqual({
      since: "2026-08",
      change: 12_400_000,
      contributed: 12_000_000,
      market: 400_000,
    });
  });

  it("is null without months", () => {
    expect(assetHistorySummary({ ...history, months: [] })).toBeNull();
  });
});

describe("summarySentence", () => {
  const shown = (amount: number, format?: (amount: number) => string) =>
    displayAmount(amount, false, format);
  const hidden = (amount: number, format?: (amount: number) => string) =>
    displayAmount(amount, true, format);

  it("reads a rise with signed contribution and market", () => {
    expect(
      summarySentence(
        { since: "2026-09", change: 12_400_000, contributed: 12_000_000, market: 400_000 },
        shown,
      ),
    ).toBe("Naik Rp12,4 jt sejak Sep 2026: setoran +Rp12 jt, pasar +Rp400 rb.");
  });

  it("reads a fall, a negative market written with a minus sign", () => {
    expect(
      summarySentence(
        { since: "2026-09", change: -1_300_000, contributed: -1_000_000, market: -300_000 },
        shown,
      ),
    ).toBe("Turun Rp1,3 jt sejak Sep 2026: setoran −Rp1 jt, pasar −Rp300 rb.");
  });

  it("reads no change as Tetap, a zero part without a sign", () => {
    expect(summarySentence({ since: "2026-09", change: 0, contributed: 0, market: 0 }, shown)).toBe(
      "Tetap sejak Sep 2026: setoran Rp0, pasar Rp0.",
    );
    expect(
      summarySentence(
        { since: "2026-09", change: 0, contributed: 500_000, market: -500_000 },
        shown,
      ),
    ).toBe("Tetap sejak Sep 2026: setoran +Rp500 rb, pasar −Rp500 rb.");
  });

  it("hides every amount while amounts are hidden", () => {
    expect(
      summarySentence(
        { since: "2026-09", change: 12_400_000, contributed: 12_000_000, market: 400_000 },
        hidden,
      ),
    ).toBe("Naik Rp••••• sejak Sep 2026: setoran Rp•••••, pasar Rp•••••.");
  });
});
