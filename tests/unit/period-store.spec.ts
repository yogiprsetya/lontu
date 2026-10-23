import { afterEach, describe, expect, it, vi } from "vitest";

async function loadStore() {
  vi.resetModules();
  const { usePeriodStore } = await import("@/stores/period");
  return usePeriodStore;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("usePeriodStore", () => {
  it("defaults to the current month in Asia/Jakarta", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T05:00:00Z"));

    const store = await loadStore();

    expect(store.getState()).toMatchObject({ year: 2026, month: 10 });
  });

  it("rolls into the next month when UTC is still on the last day but WIB is past midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T17:30:00Z"));

    const store = await loadStore();

    expect(store.getState()).toMatchObject({ year: 2027, month: 1 });
  });

  it("setPeriod accepts a whole-year period with month null", async () => {
    const store = await loadStore();

    store.getState().setPeriod(2025, null);

    expect(store.getState()).toMatchObject({ year: 2025, month: null });
  });
});
