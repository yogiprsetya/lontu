import { describe, expect, it } from "vitest";
import {
  STALE_AFTER_DAYS,
  changedItems,
  checkInMessage,
  formatMarketGain,
  isStale,
  valuedLabel,
} from "@/lib/valuation-format";

const today = "2026-11-15";

describe("isStale", () => {
  it("is stale when the account was never valued", () => {
    expect(isStale(null, today)).toBe(true);
  });

  it(`is fresh up to ${STALE_AFTER_DAYS} days and stale after`, () => {
    expect(isStale("2026-10-11", today)).toBe(false);
    expect(isStale("2026-10-10", today)).toBe(true);
  });
});

describe("valuedLabel", () => {
  it("names the last date, with the year only when it differs", () => {
    expect(valuedLabel("2026-10-12", today)).toBe("diperbarui 12 Okt");
    expect(valuedLabel("2025-12-30", "2026-01-10")).toBe("diperbarui 30 Des 2025");
  });

  it("says never, and spells out a stale age in days", () => {
    expect(valuedLabel(null, today)).toBe("belum pernah diperbarui");
    expect(valuedLabel("2026-09-29", today)).toBe("belum diperbarui 47 hari");
  });
});

describe("formatMarketGain", () => {
  it("writes the sign as text, never only as colour", () => {
    expect(formatMarketGain(500_000)).toBe("+Rp500.000");
    expect(formatMarketGain(-1_250_000)).toBe("−Rp1.250.000");
    expect(formatMarketGain(0)).toBe("Rp0");
  });
});

describe("changedItems", () => {
  const assets = [
    { accountId: "a", balance: 100 },
    { accountId: "b", balance: 200 },
    { accountId: "c", balance: 300 },
  ];

  it("sends only the rows whose value differs from the balance, in list order", () => {
    const values = new Map([
      ["c", 350],
      ["a", 100],
      ["b", 0],
    ]);
    expect(changedItems(assets, values)).toEqual([
      { accountId: "b", value: 0 },
      { accountId: "c", value: 350 },
    ]);
  });

  it("is empty when nothing was edited", () => {
    expect(changedItems(assets, new Map())).toEqual([]);
  });
});

describe("checkInMessage", () => {
  it.each([
    [0, "Nilai sama, tidak ada yang dicatat"],
    [1, "1 nilai diperbarui"],
    [3, "3 nilai diperbarui"],
  ])("%i → %s", (recorded, text) => {
    expect(checkInMessage(recorded)).toBe(text);
  });
});
