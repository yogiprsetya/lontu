import { describe, expect, it } from "vitest";
import { withChanges } from "@/lib/asset-history";

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
