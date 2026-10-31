import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn() }) }));

const { toast } = await import("sonner");
const { ApiError } = await import("@/lib/fetcher");
const { createOutbox } = await import("@/lib/offline/outbox");
const { discardQueued, retryQueued, SEND_TIMEOUT_MS, sendCreate, submitTransaction } =
  await import("@/lib/offline/submission");
import type { OutboxBody } from "@/lib/offline/outbox";
import type { KeyValueStore } from "@/lib/offline/storage";

function mapStore(): KeyValueStore {
  const data = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => data.get(key) as T | undefined,
    set: async (key, value) => void data.set(key, value),
    del: async (key) => void data.delete(key),
    entries: async <T>() => [...data.entries()] as [string, T][],
  };
}

const body: OutboxBody = {
  type: "expense",
  id: "0b0e5f7e-4f0a-4c53-9a4e-2f6d1c9f8a11",
  amount: 25_000,
  date: "2026-10-25",
  accountId: "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f",
  categoryId: "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b",
  description: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(toast).mockReset();
  vi.mocked(toast.success).mockReset();
});

describe("sendCreate", () => {
  it("posts the body as JSON to /api/transactions with a 10 s timeout", async () => {
    const created = { transaction: { id: body.id }, fee: null };
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(created, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await expect(sendCreate(body)).resolves.toEqual(created);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/transactions");
    expect(init).toMatchObject({ method: "POST", headers: { "content-type": "application/json" } });
    expect(JSON.parse(init!.body as string)).toEqual(body);
    expect(timeout).toHaveBeenCalledWith(SEND_TIMEOUT_MS);
    expect(SEND_TIMEOUT_MS).toBe(10_000);
  });

  it("throws ApiError with status, code and fields on a rejected create", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Data tidak valid",
              fields: { accountId: ["Akun sudah diarsipkan"] },
            },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(sendCreate(body)).rejects.toEqual(
      new ApiError(400, "VALIDATION_ERROR", "Data tidak valid", {
        accountId: ["Akun sudah diarsipkan"],
      }),
    );
  });

  it("lets a network failure through as is", async () => {
    const failure = new TypeError("Failed to fetch");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(failure)),
    );

    await expect(sendCreate(body)).rejects.toBe(failure);
  });
});

describe("submitTransaction", () => {
  const input = {
    type: "expense",
    amount: 25_000,
    date: "2026-10-25",
    accountId: body.accountId,
    categoryId: "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b",
    description: null,
  } as const;

  it("queues offline, says so, and asks the browser to keep the outbox", async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal("navigator", { onLine: false, storage: { persist } });
    const outbox = createOutbox(mapStore());

    const outcome = await submitTransaction(input, {
      userId: "user-a",
      outbox,
      sentMessage: "Expense tersimpan",
    });

    expect(outcome.status).toBe("queued");
    expect(await outbox.list("user-a")).toHaveLength(1);
    expect(toast).toHaveBeenCalledWith("Disimpan di perangkat, dikirim saat online");
    expect(toast.success).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalled();
  });

  it("shows the caller's message once the server has it", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ transaction: { id: "x" }, fee: null }, { status: 201 })),
    );

    const outcome = await submitTransaction(input, {
      userId: "user-a",
      sentMessage: "Transfer dan biaya admin tersimpan",
    });

    expect(outcome.status).toBe("sent");
    expect(toast.success).toHaveBeenCalledWith("Transfer dan biaya admin tersimpan");
    expect(toast).not.toHaveBeenCalled();
  });

  it("throws the network error offline when there is no user to queue for", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    await expect(
      submitTransaction(input, { userId: undefined, sentMessage: "x" }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("retryQueued / discardQueued", () => {
  it("puts a failed item back to pending and starts a replay pass", async () => {
    const outbox = createOutbox(mapStore());
    await outbox.enqueue("user-a", body);
    await outbox.markFailed(body.id, { message: "Akun sudah diarsipkan" });
    const target = new EventTarget();
    const onReplay = vi.fn();
    target.addEventListener("lontu:replay", onReplay);
    vi.stubGlobal("window", target);

    await retryQueued(body.id, outbox);

    expect((await outbox.list("user-a"))[0]).toMatchObject({ status: "pending", error: undefined });
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it("removes the item from the device", async () => {
    const outbox = createOutbox(mapStore());
    await outbox.enqueue("user-a", body);

    await discardQueued(body.id, outbox);

    expect(await outbox.list("user-a")).toEqual([]);
  });
});
