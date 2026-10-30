import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

describe("DEFAULT_CATEGORIES", () => {
  it("has the 16 categories from the spec", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(16);
    const byGroup = (kind: string, spendingType: string | null) =>
      DEFAULT_CATEGORIES.filter((c) => c.kind === kind && c.spendingType === spendingType).map(
        (c) => c.name,
      );

    expect(byGroup("income", null)).toEqual(["Gaji", "Bonus", "Hadiah", "Lainnya"]);
    expect(byGroup("saving", null)).toEqual(["Dana Darurat", "Tabungan", "Investasi"]);
    expect(byGroup("spending", "needs")).toEqual([
      "Makan",
      "Transportasi",
      "Tagihan",
      "Belanja Bulanan",
      "Kesehatan",
    ]);
    expect(byGroup("spending", "wants")).toEqual(["Hiburan", "Jajan", "Belanja", "Langganan"]);
  });

  it("has unique names per kind, case-insensitively", () => {
    const keys = DEFAULT_CATEGORIES.map((c) => `${c.kind}:${c.name.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives a spendingType to spending categories only", () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(c.spendingType !== null).toBe(c.kind === "spending");
    }
  });
});
