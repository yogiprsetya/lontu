import { describe, expect, it, vi } from "vitest";
import { clearOfflineCaches, clearOfflineData, ensureCacheOwner } from "@/lib/offline/clear";
import { createOutbox } from "@/lib/offline/outbox";
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

describe("clearOfflineData", () => {
  function kvStore(): KeyValueStore {
    const data = new Map<string, unknown>();
    return {
      get: async <T>(key: string) => data.get(key) as T | undefined,
      set: async (key, value) => void data.set(key, value),
      del: async (key) => void data.delete(key),
      entries: async <T>() => [...data.entries()] as [string, T][],
    };
  }

  const body = (id: string) =>
    ({
      type: "expense",
      id,
      amount: 1_000,
      date: "2026-10-25",
      accountId: "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f",
      categoryId: "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b",
      description: null,
    }) as const;

  it("drops that user's outbox items and the caches, leaving other users' items", async () => {
    const outbox = createOutbox(kvStore());
    await outbox.enqueue("a", body("t1"));
    await outbox.enqueue("b", body("t2"));
    await outbox.enqueue("a", body("t3"));
    const clearCaches = vi.fn(async () => {});

    await clearOfflineData("a", { outbox, clearCaches });

    expect(await outbox.list("a")).toEqual([]);
    expect((await outbox.list("b")).map((i) => i.id)).toEqual(["t2"]);
    expect(clearCaches).toHaveBeenCalledTimes(1);
  });
});
