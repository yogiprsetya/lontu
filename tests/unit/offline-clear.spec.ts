import { describe, expect, it, vi } from "vitest";
import { clearOfflineCaches, ensureCacheOwner } from "@/lib/offline/clear";
import type { KeyValueStore } from "@/lib/offline/storage";

function mapStore(initial: Record<string, unknown> = {}): Pick<KeyValueStore, "get" | "set"> & { data: Map<string, unknown> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: async <T>(key: string) => data.get(key) as T | undefined,
    set: async (key, value) => void data.set(key, value),
  };
}

function fakeCaches(names: string[]) {
  const stored = new Set(names);
  return {
    stored,
    delete: vi.fn(async (name: string) => stored.delete(name)),
  };
}

describe("clearOfflineCaches", () => {
  it("deletes the API and page caches but keeps the precache", async () => {
    const caches = fakeCaches(["lontu-api", "pages", "pages-rsc", "pages-rsc-prefetch", "serwist-precache-v2"]);

    await clearOfflineCaches(caches);

    expect([...caches.stored]).toEqual(["serwist-precache-v2"]);
  });

  it("does nothing when Cache Storage is unavailable", async () => {
    await expect(clearOfflineCaches(undefined)).resolves.toBeUndefined();
  });
});

describe("ensureCacheOwner", () => {
  it("keeps the caches when the owner is the same user", async () => {
    const store = mapStore({ cacheOwner: "user-a" });
    const clear = vi.fn(async () => {});

    await ensureCacheOwner("user-a", { store, clear });

    expect(clear).not.toHaveBeenCalled();
  });

  it("clears once and records the new owner when the user changed", async () => {
    const store = mapStore({ cacheOwner: "user-a" });
    const clear = vi.fn(async () => {});

    await ensureCacheOwner("user-b", { store, clear });
    await ensureCacheOwner("user-b", { store, clear });

    expect(clear).toHaveBeenCalledTimes(1);
    expect(store.data.get("cacheOwner")).toBe("user-b");
  });

  it("clears once when no owner was recorded yet", async () => {
    const store = mapStore();
    const clear = vi.fn(async () => {});

    await ensureCacheOwner("user-a", { store, clear });
    await ensureCacheOwner("user-a", { store, clear });

    expect(clear).toHaveBeenCalledTimes(1);
    expect(store.data.get("cacheOwner")).toBe("user-a");
  });
});
