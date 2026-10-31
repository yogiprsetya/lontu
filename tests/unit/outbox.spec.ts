import { describe, expect, it, vi } from "vitest";
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

function clock(start = Date.parse("2026-10-25T01:00:00Z")) {
  let t = start;
  return () => new Date((t += 1000));
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

describe("outbox", () => {
  it("stores a pending item once per id", async () => {
    const outbox = createOutbox(mapStore(), clock());

    await outbox.enqueue("user-a", body("t1"));
    await outbox.enqueue("user-a", body("t1"));

    expect(await outbox.list("user-a")).toEqual([
      {
        id: "t1",
        userId: "user-a",
        body: body("t1"),
        createdAt: "2026-10-25T01:00:01.000Z",
        status: "pending",
        attempts: 0,
      },
    ]);
  });

  it("lists only that user's items, oldest first", async () => {
    const outbox = createOutbox(mapStore(), clock());
    await outbox.enqueue("user-a", body("t1"));
    await outbox.enqueue("user-b", body("t2"));
    await outbox.enqueue("user-a", body("t3"));

    expect((await outbox.list("user-a")).map((i) => i.id)).toEqual(["t1", "t3"]);
  });

  it("ignores other keys in the shared store", async () => {
    const store = mapStore();
    await store.set("cacheOwner", "user-a");
    const outbox = createOutbox(store, clock());
    await outbox.enqueue("user-a", body("t1"));

    expect((await outbox.list("user-a")).map((i) => i.id)).toEqual(["t1"]);
  });

  it("marks an item failed with the server error, and retry makes it pending again", async () => {
    const outbox = createOutbox(mapStore(), clock());
    await outbox.enqueue("user-a", body("t1"));

    await outbox.markFailed("t1", {
      message: "Akun sudah diarsipkan",
      fields: { accountId: ["Akun sudah diarsipkan"] },
    });
    expect((await outbox.list("user-a"))[0]).toMatchObject({
      status: "failed",
      error: { message: "Akun sudah diarsipkan", fields: { accountId: ["Akun sudah diarsipkan"] } },
    });

    await outbox.retry("t1");
    const [item] = await outbox.list("user-a");
    expect(item.status).toBe("pending");
    expect(item.error).toBeUndefined();
  });

  it("counts attempts and removes items", async () => {
    const outbox = createOutbox(mapStore(), clock());
    await outbox.enqueue("user-a", body("t1"));

    await outbox.bump("t1");
    await outbox.bump("t1");
    expect((await outbox.list("user-a"))[0].attempts).toBe(2);

    await outbox.remove("t1");
    expect(await outbox.list("user-a")).toEqual([]);
  });

  it("notifies subscribers on every change until they unsubscribe", async () => {
    const outbox = createOutbox(mapStore(), clock());
    const listener = vi.fn();
    const unsubscribe = outbox.subscribe(listener);

    await outbox.enqueue("user-a", body("t1"));
    await outbox.bump("t1");
    await outbox.markFailed("t1", { message: "x" });
    await outbox.retry("t1");
    await outbox.remove("t1");
    expect(listener).toHaveBeenCalledTimes(5);

    unsubscribe();
    await outbox.enqueue("user-a", body("t2"));
    expect(listener).toHaveBeenCalledTimes(5);
  });
});
