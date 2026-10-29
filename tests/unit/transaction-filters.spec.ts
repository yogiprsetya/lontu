import { describe, expect, it } from "vitest";
import {
  filtersToSearchParams,
  countActiveFilters,
  exportFilename,
  exportHref,
  filtersToUrl,
  normalizeFilters,
  parseFilters,
  resetFilters,
} from "@/lib/transaction-filters";
import { periodToRange } from "@/lib/period";

const TODAY = "2026-10-22";
const ACCOUNT = "0b0e5f7e-4f0a-4c53-9a4e-2f6d1c9f8a11";
const CATEGORY = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

const parse = (qs: string) => parseFilters(new URLSearchParams(qs), TODAY);

describe("parseFilters", () => {
  it("defaults to the current Jakarta month", () => {
    expect(parse("")).toEqual({ period: "2026-10" });
  });

  it("reads every param", () => {
    expect(parse(`period=2026&type=expense&accountId=${ACCOUNT}&categoryId=${CATEGORY}`)).toEqual({
      period: "2026",
      type: "expense",
      accountId: ACCOUNT,
      categoryId: CATEGORY,
    });
  });

  it("accepts all-time", () => {
    expect(parse("period=all").period).toBe("all");
  });

  it.each(["2026-13", "2026-00", "26", "abc", "2026-1", "2026-10-01", ""])("ignores invalid period %j", (period) => {
    expect(parse(`period=${period}`).period).toBe("2026-10");
  });

  it("ignores invalid type and ids, and unknown params", () => {
    expect(parse("type=foo&accountId=abc&categoryId=1&x=y")).toEqual({ period: "2026-10" });
  });
});

describe("filtersToSearchParams (API / SWR key)", () => {
  it("expands the period into from/to in a fixed param order", () => {
    const params = filtersToSearchParams({ categoryId: CATEGORY, period: "2026-02", type: "expense", accountId: ACCOUNT });
    expect(params.toString()).toBe(
      `type=expense&accountId=${ACCOUNT}&categoryId=${CATEGORY}&from=2026-02-01&to=2026-02-28`,
    );
  });

  it("drops empty values and sends no range for all-time", () => {
    expect(filtersToSearchParams({ period: "all" }).toString()).toBe("");
  });

  it("gives the same key for the same filters regardless of object key order", () => {
    const a = filtersToSearchParams({ period: "2026-10", type: "income", accountId: ACCOUNT });
    const b = filtersToSearchParams({ accountId: ACCOUNT, type: "income", period: "2026-10" });
    expect(a.toString()).toBe(b.toString());
  });
});

describe("filtersToUrl and round trip", () => {
  it("keeps the period and orders params", () => {
    expect(filtersToUrl({ type: "expense", period: "all" })).toBe("period=all&type=expense");
  });

  it("round-trips through parseFilters", () => {
    const filters = { period: "2025", type: "transfer", accountId: ACCOUNT } as const;
    expect(parse(filtersToUrl(filters))).toEqual(filters);
  });
});

describe("normalizeFilters", () => {
  const kindOf = (id: string) => (id === CATEGORY ? ("income" as const) : undefined);

  it.each(["transfer", "adjustment"] as const)("drops the category when type is %s", (type) => {
    expect(normalizeFilters({ period: "all", type, categoryId: CATEGORY }, kindOf)).toEqual({ period: "all", type });
  });

  it("drops a category whose kind does not match the type", () => {
    expect(normalizeFilters({ period: "all", type: "expense", categoryId: CATEGORY }, kindOf)).toEqual({
      period: "all",
      type: "expense",
    });
  });

  it("keeps a matching category, and any category when there is no type", () => {
    const matching = { period: "all", type: "income", categoryId: CATEGORY } as const;
    expect(normalizeFilters(matching, kindOf)).toEqual(matching);
    const untyped = { period: "all", categoryId: CATEGORY } as const;
    expect(normalizeFilters(untyped, kindOf)).toEqual(untyped);
  });

  it("keeps a category it cannot look up", () => {
    const f = { period: "all", type: "expense", categoryId: "unknown" } as const;
    expect(normalizeFilters(f, kindOf)).toEqual(f);
  });
});

describe("countActiveFilters / resetFilters", () => {
  it("counts type, account and category, never the period", () => {
    expect(countActiveFilters({ period: "2026-10" })).toBe(0);
    expect(countActiveFilters({ period: "all", type: "expense" })).toBe(1);
    expect(countActiveFilters({ period: "all", type: "expense", accountId: ACCOUNT, categoryId: CATEGORY })).toBe(3);
  });

  it("reset keeps the period only", () => {
    expect(resetFilters({ period: "2025", type: "income", accountId: ACCOUNT, categoryId: CATEGORY })).toEqual({
      period: "2025",
    });
  });
});

describe("normalizeFilters with lockedType", () => {
  const kindOf = (id: string) => (id === CATEGORY ? ("income" as const) : undefined);

  it("forces the locked type over whatever the URL carried", () => {
    expect(normalizeFilters({ period: "all", type: "income" }, kindOf, "expense")).toEqual({ period: "all", type: "expense" });
    expect(normalizeFilters({ period: "all" }, kindOf, "expense")).toEqual({ period: "all", type: "expense" });
  });

  it("drops a category that does not fit the locked type", () => {
    expect(normalizeFilters({ period: "all", categoryId: CATEGORY }, kindOf, "expense")).toEqual({
      period: "all",
      type: "expense",
    });
  });

  it("keeps a category that fits", () => {
    const spendingKind = () => "spending" as const;
    expect(normalizeFilters({ period: "all", categoryId: CATEGORY }, spendingKind, "expense")).toEqual({
      period: "all",
      type: "expense",
      categoryId: CATEGORY,
    });
  });
});

describe("exportFilename", () => {
  it.each([
    [{ from: "2026-10-01", to: "2026-10-31" }, "lontu-transaksi-2026-10.csv"],
    [{ from: "2028-02-01", to: "2028-02-29" }, "lontu-transaksi-2028-02.csv"],
    [{ from: "2026-01-01", to: "2026-12-31" }, "lontu-transaksi-2026.csv"],
    [{}, "lontu-transaksi-semua.csv"],
    [{ from: "2026-10-05", to: "2026-10-20" }, "lontu-transaksi-2026-10-05_2026-10-20.csv"],
    [{ from: "2026-10-05" }, "lontu-transaksi-2026-10-05_.csv"],
  ])("%j → %s", (range, name) => {
    expect(exportFilename(range)).toBe(name);
  });

  it("agrees with periodToRange for every period shape", () => {
    for (const period of ["2026-10", "2026", "all"]) {
      const name = exportFilename(periodToRange(period));
      expect(name).toBe(`lontu-transaksi-${period === "all" ? "semua" : period}.csv`);
    }
  });
});

describe("exportHref", () => {
  it("carries the active filters and the period range, never cursor or limit", () => {
    expect(exportHref({ period: "2026-10", type: "expense" })).toBe(
      "/api/transactions/export?type=expense&from=2026-10-01&to=2026-10-31",
    );
  });

  it("has no query for all-time without filters", () => {
    expect(exportHref({ period: "all" })).toBe("/api/transactions/export");
  });
});

describe("period lower bound", () => {
  it.each(["1999", "0001", "1999-12"])("ignores a URL period before 2000: %s", (period) => {
    expect(parse(`period=${period}`).period).toBe("2026-10");
  });
});
