import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/fetcher";
import { SEND_TIMEOUT_MS, sendCreate } from "@/lib/offline/submission";
import type { OutboxBody } from "@/lib/offline/outbox";

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
          { error: { code: "VALIDATION_ERROR", message: "Data tidak valid", fields: { accountId: ["Akun sudah diarsipkan"] } } },
          { status: 400 },
        ),
      ),
    );

    await expect(sendCreate(body)).rejects.toEqual(
      new ApiError(400, "VALIDATION_ERROR", "Data tidak valid", { accountId: ["Akun sudah diarsipkan"] }),
    );
  });

  it("lets a network failure through as is", async () => {
    const failure = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(failure)));

    await expect(sendCreate(body)).rejects.toBe(failure);
  });
});
