import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetcher } from "@/lib/fetcher";

function mockFetch(response: Response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetcher", () => {
  it("returns parsed JSON for 2xx responses", async () => {
    mockFetch(Response.json({ id: "u1" }));
    await expect(fetcher("/api/me")).resolves.toEqual({ id: "u1" });
  });

  it("throws ApiError carrying the uniform error body", async () => {
    mockFetch(
      Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Data tidak valid", fields: { name: ["Wajib diisi"] } } },
        { status: 400 },
      ),
    );

    const error = await fetcher("/api/me").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Data tidak valid",
      fields: { name: ["Wajib diisi"] },
    });
  });

  it("throws ApiError with a fallback code when the error body is not JSON", async () => {
    mockFetch(new Response("Bad Gateway", { status: 502, statusText: "Bad Gateway" }));

    const error = await fetcher("/api/me").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "UNKNOWN", fields: undefined });
  });
});
