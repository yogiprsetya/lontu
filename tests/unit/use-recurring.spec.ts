import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("swr", async (importOriginal) => ({ ...(await importOriginal<typeof import("swr")>()), mutate: vi.fn() }));

const { mutate } = await import("swr");
const { advanceRule, archiveRule, createRule, recurringKey, restoreRule, updateRule } = await import("@/hooks/use-recurring");
const { ApiError } = await import("@/lib/fetcher");

const mockedMutate = vi.mocked(mutate);
const id = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ id }));

function revalidated(key: string) {
  return mockedMutate.mock.calls.some(([matcher]) => typeof matcher === "function" && (matcher as (k: unknown) => boolean)(key));
}

beforeEach(() => {
  mockedMutate.mockReset();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recurringKey", () => {
  it("adds includeArchived only when asked", () => {
    expect(recurringKey()).toBe("/api/recurring");
    expect(recurringKey({ includeArchived: true })).toBe("/api/recurring?includeArchived=true");
  });
});

describe("rule mutations", () => {
  it.each([
    ["createRule", () => createRule({ type: "expense", name: "Netflix", amount: 1, accountId: id, categoryId: id, dayOfMonth: 5, isPayday: false }), "/api/recurring", "POST"],
    ["updateRule", () => updateRule(id, { amount: 2 }), `/api/recurring/${id}`, "PATCH"],
    ["archiveRule", () => archiveRule(id), `/api/recurring/${id}`, "DELETE"],
    ["restoreRule", () => restoreRule(id), `/api/recurring/${id}/restore`, "POST"],
  ])("%s calls the route and refreshes recurring keys", async (_name, run, url, method) => {
    await run();
    expect(fetchMock.mock.calls[0][0]).toBe(url);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe(method);
    expect(revalidated("/api/recurring")).toBe(true);
    expect(revalidated("/api/recurring?includeArchived=true")).toBe(true);
  });

  it("throws ApiError and does not invalidate on failure", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: { code: "RULE_NOT_FOUND", message: "x" } }, { status: 404 }));
    await expect(archiveRule(id)).rejects.toBeInstanceOf(ApiError);
    expect(mockedMutate).not.toHaveBeenCalled();
  });
});

describe("advanceRule", () => {
  const post = {
    action: "post" as const,
    occurrenceDate: "2026-10-05",
    id,
    amount: 1,
    date: "2026-10-05",
    accountId: id,
    categoryId: id,
    description: null,
  };

  it("refreshes transactions, balances, budgets and the dashboard after a post", async () => {
    await advanceRule(id, post);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/recurring/${id}/advance`);
    for (const key of ["$inf$/api/transactions", "/api/accounts", "/api/budgets?period=2026-10", "/api/dashboard", "/api/recurring"]) {
      expect(revalidated(key)).toBe(true);
    }
  });

  it("refreshes only recurring and the transaction list after a skip", async () => {
    await advanceRule(id, { action: "skip", occurrenceDate: "2026-10-05" });
    expect(revalidated("/api/recurring")).toBe(true);
    expect(revalidated("/api/accounts")).toBe(false);
  });

  it("throws ApiError with OCCURRENCE_STALE on a 409", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: { code: "OCCURRENCE_STALE", message: "x" } }, { status: 409 }));
    await expect(advanceRule(id, post)).rejects.toMatchObject({ status: 409, code: "OCCURRENCE_STALE" });
  });
});
