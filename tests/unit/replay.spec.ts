import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/fetcher";
import { createOutbox } from "@/lib/offline/outbox";
import { replayOutbox } from "@/lib/offline/replay";
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

function clock() {
  let t = Date.parse("2026-10-25T01:00:00Z");
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

// `send` resolves on 2xx and throws what sendJSON throws: ApiError for any other HTTP status.
const sentOk = () => Promise.resolve({});
const httpError = (status: number, code = "X", message = "x", fields?: Record<string, string[]>) =>
  Promise.reject(new ApiError(status, code, message, fields));

async function outboxWith(...items: [userId: string, id: string][]) {
  const outbox = createOutbox(mapStore(), clock());
  for (const [userId, id] of items) await outbox.enqueue(userId, body(id));
  return outbox;
}

describe("replayOutbox", () => {
  it("sends pending items oldest first and removes them on 201 or 200", async () => {
    const outbox = await outboxWith(["user-a", "t1"], ["user-a", "t2"]);
    const send = vi.fn().mockImplementationOnce(sentOk).mockImplementationOnce(sentOk);

    const result = await replayOutbox({ outbox, send, userId: "user-a" });

    expect(send.mock.calls.map(([b]) => b.id)).toEqual(["t1", "t2"]);
    expect(result).toEqual({ sent: 2, failed: 0, stopped: null });
    expect(await outbox.list("user-a")).toEqual([]);
  });

  it.each([400, 409])("marks a %i failed with the server message and moves on", async (status) => {
    const outbox = await outboxWith(["user-a", "t1"], ["user-a", "t2"]);
    const rejected = () => httpError(status, "VALIDATION_ERROR", "Data tidak valid", { accountId: ["Akun sudah diarsipkan"] });
    const send = vi.fn().mockImplementationOnce(rejected).mockImplementationOnce(sentOk);

    const result = await replayOutbox({ outbox, send, userId: "user-a" });

    expect(result).toEqual({ sent: 1, failed: 1, stopped: null });
    expect(await outbox.list("user-a")).toEqual([
      expect.objectContaining({
        id: "t1",
        status: "failed",
        error: { message: "Akun sudah diarsipkan", fields: { accountId: ["Akun sudah diarsipkan"] } },
      }),
    ]);
  });

  it("uses the error message when there are no field errors", async () => {
    const outbox = await outboxWith(["user-a", "t1"]);
    const send = vi.fn(() => httpError(409, "TRANSACTION_ID_TAKEN", "Id sudah dipakai"));

    await replayOutbox({ outbox, send, userId: "user-a" });

    expect((await outbox.list("user-a"))[0].error).toEqual({ message: "Id sudah dipakai" });
  });

  it("stops on 401 and leaves the rest pending", async () => {
    const outbox = await outboxWith(["user-a", "t1"], ["user-a", "t2"]);
    const send = vi.fn(() => httpError(401, "UNAUTHORIZED"));

    const result = await replayOutbox({ outbox, send, userId: "user-a" });

    expect(result).toEqual({ sent: 0, failed: 0, stopped: "auth" });
    expect(send).toHaveBeenCalledTimes(1);
    expect((await outbox.list("user-a")).map((i) => [i.status, i.attempts])).toEqual([
      ["pending", 0],
      ["pending", 0],
    ]);
  });

  it.each([
    ["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a 5xx", () => httpError(503)],
    ["a 500", () => httpError(500, "INTERNAL")],
    ["a timeout", () => Promise.reject(new DOMException("signal timed out", "TimeoutError"))],
    ["a non-4xx status", () => httpError(302)],
  ])("stops on %s and counts the attempt", async (_, response) => {
    const outbox = await outboxWith(["user-a", "t1"], ["user-a", "t2"]);
    const send = vi.fn(response);

    const result = await replayOutbox({ outbox, send, userId: "user-a" });

    expect(result).toEqual({ sent: 0, failed: 0, stopped: "network" });
    expect(send).toHaveBeenCalledTimes(1);
    expect((await outbox.list("user-a")).map((i) => i.attempts)).toEqual([1, 0]);
  });

  it("skips failed items and other users' items", async () => {
    const outbox = await outboxWith(["user-a", "t1"], ["user-b", "t2"], ["user-a", "t3"]);
    await outbox.markFailed("t1", { message: "x" });
    const send = vi.fn().mockImplementation(sentOk);

    const result = await replayOutbox({ outbox, send, userId: "user-a" });

    expect(send.mock.calls.map(([b]) => b.id)).toEqual(["t3"]);
    expect(result).toEqual({ sent: 1, failed: 0, stopped: null });
    expect((await outbox.list("user-b")).map((i) => i.id)).toEqual(["t2"]);
  });
});
