import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/fetcher";
import { createOutbox } from "@/lib/offline/outbox";
import { REPLAY_INTERVAL_MS, replayOutbox, requestReplay, startReplay, type ReplayResult } from "@/lib/offline/replay";
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

describe("startReplay", () => {
  type Page = EventTarget & { visibilityState: DocumentVisibilityState };
  let target: EventTarget;
  let page: Page;
  let online: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    target = new EventTarget();
    page = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
    online = true;
    // requestReplay dispatches on window; here the window is the test target.
    vi.stubGlobal("window", target);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const noLock = (run: () => Promise<ReplayResult>) => run();

  async function start(overrides: Partial<Parameters<typeof startReplay>[0]> = {}) {
    const outbox = await outboxWith(["user-a", "t1"]);
    const send = vi.fn().mockImplementation(sentOk);
    const onSent = vi.fn(async () => {});
    const onAuthLost = vi.fn();
    const stop = startReplay({ userId: "user-a", outbox, send, target, page, isOnline: () => online, lock: noLock, onSent, onAuthLost, ...overrides });
    await vi.advanceTimersByTimeAsync(0);
    return { outbox, send, onSent, onAuthLost, stop };
  }

  // Each pass reads the outbox; counting list calls counts passes, even when nothing is pending.
  async function passes(outbox: Awaited<ReturnType<typeof outboxWith>>, act: () => unknown) {
    const list = vi.spyOn(outbox, "list");
    await act();
    await vi.advanceTimersByTimeAsync(0);
    return list.mock.calls.length;
  }

  it("runs one pass at start and calls onSent when it sent something", async () => {
    const { send, onSent, stop } = await start();
    expect(send).toHaveBeenCalledTimes(1);
    expect(onSent).toHaveBeenCalledTimes(1);
    stop();
  });

  it("does not call onSent after a pass that sent nothing", async () => {
    const outbox = await outboxWith();
    const onSent = vi.fn(async () => {});
    const stop = startReplay({ userId: "user-a", outbox, send: vi.fn(), target, page, isOnline: () => online, lock: noLock, onSent, onAuthLost: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    expect(onSent).not.toHaveBeenCalled();
    stop();
  });

  it.each([
    ["online", () => target.dispatchEvent(new Event("online"))],
    ["requestReplay", () => requestReplay()],
    ["the page becoming visible", () => page.dispatchEvent(new Event("visibilitychange"))],
    ["the interval", () => vi.advanceTimersByTimeAsync(REPLAY_INTERVAL_MS)],
  ])("runs another pass on %s", async (_, trigger) => {
    const { outbox, stop } = await start();
    expect(await passes(outbox, trigger)).toBe(1);
    stop();
  });

  it("skips the pass when the page turns hidden", async () => {
    const { outbox, stop } = await start();
    page.visibilityState = "hidden";
    expect(await passes(outbox, () => void page.dispatchEvent(new Event("visibilitychange")))).toBe(0);
    stop();
  });

  it("does not run while offline", async () => {
    online = false;
    const { send, outbox, stop } = await start();
    expect(send).not.toHaveBeenCalled();
    expect(await passes(outbox, () => vi.advanceTimersByTimeAsync(REPLAY_INTERVAL_MS))).toBe(0);
    stop();
  });

  it("stop removes every listener and the interval", async () => {
    const { outbox, stop } = await start();
    stop();
    const count = await passes(outbox, async () => {
      target.dispatchEvent(new Event("online"));
      requestReplay();
      page.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(REPLAY_INTERVAL_MS * 2);
    });
    expect(count).toBe(0);
  });

  it("calls onAuthLost when the session has expired", async () => {
    const { onAuthLost, onSent, stop } = await start({ send: vi.fn(() => httpError(401, "UNAUTHORIZED")) });
    expect(onAuthLost).toHaveBeenCalledTimes(1);
    expect(onSent).not.toHaveBeenCalled();
    stop();
  });

  it("sends once when two passes overlap under the lock", async () => {
    let held = false;
    // Same contract as navigator.locks with ifAvailable: a second caller gets null instead of waiting.
    const lock = async (run: () => Promise<ReplayResult>) => {
      if (held) return null;
      held = true;
      try {
        return await run();
      } finally {
        held = false;
      }
    };
    let release!: () => void;
    const send = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const { stop } = await start({ send, lock });
    requestReplay();
    await vi.advanceTimersByTimeAsync(0);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    stop();
  });
});
