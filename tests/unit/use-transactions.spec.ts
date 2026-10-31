import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isInfiniteTransactionsKey,
  transactionsPageKey,
  transactionsTotalsKey,
} from "@/hooks/use-transactions";
import { createTransaction } from "@/lib/offline/submission";
import { isResourceKey } from "@/lib/cache-invalidation";
import { ApiError } from "@/lib/fetcher";
import { createOutbox } from "@/lib/offline/outbox";
import type { KeyValueStore } from "@/lib/offline/storage";

const isTransactionsKey = (key: unknown) => isResourceKey("transactions", key);

describe("isTransactionsKey", () => {
  it.each([
    "/api/transactions",
    "/api/transactions?type=expense",
    "/api/transactions/totals?from=2026-10-01&to=2026-10-31",
    "$inf$/api/transactions?limit=30",
  ])("matches %s", (key) => {
    expect(isTransactionsKey(key)).toBe(true);
  });

  it.each([["/api/accounts"], ["/api/transactionsx"], [["/api/transactions"]], [undefined]])(
    "does not match %j",
    (key) => {
      expect(isTransactionsKey(key)).toBe(false);
    },
  );
});

describe("transactionsPageKey", () => {
  it("starts from the bare list URL", () => {
    expect(transactionsPageKey(0, null)).toBe("/api/transactions");
  });

  it("follows the previous page's cursor, encoded", () => {
    expect(transactionsPageKey(1, { items: [], nextCursor: "a+b/c=" })).toBe(
      "/api/transactions?cursor=a%2Bb%2Fc%3D",
    );
  });

  it("stops when the previous page had no next cursor", () => {
    expect(transactionsPageKey(1, { items: [], nextCursor: null })).toBeNull();
  });

  it("produces a key that isTransactionsKey matches, including the $inf$ form", () => {
    expect(isTransactionsKey(transactionsPageKey(0, null))).toBe(true);
    expect(isTransactionsKey(`$inf$${transactionsPageKey(0, null)}`)).toBe(true);
  });
});

describe("transactionsPageKey with filters", () => {
  const filters = { period: "2026-10", type: "expense" } as const;

  it("puts the filter query on the first page", () => {
    expect(transactionsPageKey(0, null, filters)).toBe(
      "/api/transactions?type=expense&from=2026-10-01&to=2026-10-31",
    );
  });

  it("appends the cursor after the filter query", () => {
    expect(transactionsPageKey(1, { items: [], nextCursor: "abc" }, filters)).toBe(
      "/api/transactions?type=expense&from=2026-10-01&to=2026-10-31&cursor=abc",
    );
  });

  it("is the same key for equal filters", () => {
    expect(transactionsPageKey(0, null, { type: "expense", period: "2026-10" })).toBe(
      transactionsPageKey(0, null, filters),
    );
  });
});

describe("transactionsTotalsKey", () => {
  const filters = {
    period: "2026-10",
    type: "expense",
    accountId: "0b0e5f7e-4f0a-4c53-9a4e-2f6d1c9f8a11",
  } as const;

  it("is the list key's query on the totals path", () => {
    const listKey = transactionsPageKey(0, null, filters)!;
    expect(transactionsTotalsKey(filters)).toBe(
      listKey.replace("/api/transactions", "/api/transactions/totals"),
    );
  });

  it("has no query for all-time without filters", () => {
    expect(transactionsTotalsKey({ period: "all" })).toBe("/api/transactions/totals");
  });

  it("is matched by isTransactionsKey so mutations refresh it", () => {
    expect(isTransactionsKey(transactionsTotalsKey(filters))).toBe(true);
  });
});

describe("isInfiniteTransactionsKey", () => {
  it("matches only the $inf$ aggregate of the list", () => {
    expect(isInfiniteTransactionsKey("$inf$/api/transactions?type=expense")).toBe(true);
    expect(isInfiniteTransactionsKey("$inf$/api/transactions")).toBe(true);
    expect(isInfiniteTransactionsKey("/api/transactions")).toBe(false);
    expect(isInfiniteTransactionsKey("/api/transactions/totals")).toBe(false);
    expect(isInfiniteTransactionsKey("$inf$/api/accounts")).toBe(false);
    expect(isInfiniteTransactionsKey(undefined)).toBe(false);
  });
});

describe("createTransaction", () => {
  const accountId = "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f";
  const input = {
    type: "expense",
    amount: 25_000,
    date: "2026-10-25",
    accountId,
    categoryId: accountId,
    description: null,
  } as const;

  function mapStore(): KeyValueStore {
    const data = new Map<string, unknown>();
    return {
      get: async <T>(key: string) => data.get(key) as T | undefined,
      set: async (key, value) => void data.set(key, value),
      del: async (key) => void data.delete(key),
      entries: async <T>() => [...data.entries()] as [string, T][],
    };
  }

  function setup(onLine: boolean, fetchImpl: () => Promise<Response>) {
    vi.stubGlobal("navigator", { onLine });
    const fetchMock = vi.fn<typeof fetch>(() => fetchImpl());
    vi.stubGlobal("fetch", fetchMock);
    const outbox = createOutbox(mapStore());
    const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    return { fetchMock, outbox, sentBody };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("queues without fetching when the browser is offline", async () => {
    const { fetchMock, outbox } = setup(false, () =>
      Promise.resolve(new Response("{}", { status: 201 })),
    );

    const result = await createTransaction(input, { userId: "user-a", outbox });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe("queued");
    const [item] = await outbox.list("user-a");
    expect(item.id).toBe(result.status === "queued" && result.id);
    expect(item.body).toMatchObject({ ...input, id: item.id });
  });

  it("queues the same id it sent when fetch rejects", async () => {
    const { outbox, sentBody } = setup(true, () =>
      Promise.reject(new TypeError("Failed to fetch")),
    );

    const result = await createTransaction(input, { userId: "user-a", outbox });

    expect(result).toEqual({ status: "queued", id: sentBody().id });
    expect((await outbox.list("user-a"))[0].body).toEqual(sentBody());
  });

  it("gives a transfer fee its own id", async () => {
    const { outbox } = setup(false, () => Promise.reject(new TypeError("Failed to fetch")));
    const transfer = {
      type: "transfer",
      amount: 10_000,
      date: "2026-10-25",
      accountId,
      toAccountId: accountId,
      description: null,
      fee: { amount: 1_000, categoryId: accountId },
    } as const;

    await createTransaction(transfer, { userId: "user-a", outbox });

    const [{ body }] = await outbox.list("user-a");
    expect(body.type === "transfer" && body.fee?.id).toEqual(expect.any(String));
    expect(body.type === "transfer" && body.fee?.id).not.toBe(body.id);
  });

  it.each([400, 500])("throws an ApiError on %i and does not queue", async (status) => {
    const { outbox } = setup(true, () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { code: "X", message: "Gagal" } }), { status }),
      ),
    );

    await expect(createTransaction(input, { userId: "user-a", outbox })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(await outbox.list("user-a")).toEqual([]);
  });

  it("sends a client id when online and returns the created rows", async () => {
    const created = { transaction: { id: "x" }, fee: null };
    const { outbox, sentBody } = setup(true, () =>
      Promise.resolve(new Response(JSON.stringify(created), { status: 201 })),
    );

    const result = await createTransaction(input, { userId: "user-a", outbox });

    expect(sentBody().id).toEqual(expect.any(String));
    expect(result).toEqual({ status: "sent", created });
    expect(await outbox.list("user-a")).toEqual([]);
  });
});
