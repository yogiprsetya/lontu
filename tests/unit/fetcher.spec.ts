import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetcher, sendJSON } from "@/lib/fetcher";

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
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data tidak valid",
            fields: { name: ["Wajib diisi"] },
          },
        },
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

describe("sendJSON", () => {
  it("sends the method and JSON body and returns the parsed response", async () => {
    mockFetch(Response.json({ id: "a1" }, { status: 201 }));

    await expect(sendJSON("/api/accounts", "POST", { name: "BCA" })).resolves.toEqual({ id: "a1" });
    expect(fetch).toHaveBeenCalledWith("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "BCA" }),
    });
  });

  it("omits the body when none is given", async () => {
    mockFetch(Response.json({ id: "a1" }));

    await sendJSON("/api/accounts/a1", "DELETE");

    expect(fetch).toHaveBeenCalledWith("/api/accounts/a1", { method: "DELETE" });
  });

  it("throws ApiError with fields for an error response", async () => {
    mockFetch(
      Response.json({ error: { code: "ACCOUNT_NAME_TAKEN", message: "Dipakai" } }, { status: 409 }),
    );

    const error = await sendJSON("/api/accounts", "POST", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "ACCOUNT_NAME_TAKEN", message: "Dipakai" });
  });
});
