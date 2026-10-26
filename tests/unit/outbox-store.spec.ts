import { describe, expect, it, vi } from "vitest";
import { createOutboxStore } from "@/hooks/use-outbox";
import { createOutbox } from "@/lib/offline/outbox";
import type { KeyValueStore } from "@/lib/offline/storage";
import type { TransactionCreateInput } from "@/lib/schemas/transaction";

function mapStore(): KeyValueStore {
  const data = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => data.get(key) as T | undefined,
    set: async (key, value) => void data.set(key, value),
    del: async (key) => void data.delete(key),
    entries: async <T>() => [...data.entries()] as [string, T][],
  };
}

function body(id: string): TransactionCreateInput & { id: string } {
  return {
    type: "expense",
    id,
    amount: 25_000,
    date: "2026-10-25",
    accountId: "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f",
    categoryId: "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b",
    description: null,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createOutboxStore", () => {
  it("loads the user's items on first subscribe and follows later changes", async () => {
    const outbox = createOutbox(mapStore());
    await outbox.enqueue("user-a", body("t1"));
    const store = createOutboxStore(outbox, "user-a");
    const onChange = vi.fn();

    expect(store.getSnapshot()).toEqual([]);
    const unsubscribe = store.subscribe(onChange);
    await flush();
    expect(store.getSnapshot().map((i) => i.id)).toEqual(["t1"]);

    await outbox.enqueue("user-b", body("t2"));
    await outbox.enqueue("user-a", body("t3"));
    await flush();
    expect(store.getSnapshot().map((i) => i.id)).toEqual(["t1", "t3"]);
    expect(onChange).toHaveBeenCalled();

    unsubscribe();
    onChange.mockClear();
    await outbox.remove("t1");
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the same snapshot reference between reads", async () => {
    const store = createOutboxStore(createOutbox(mapStore()), "user-a");
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});
