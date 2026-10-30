import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  badRequest,
  conflict,
  fieldError,
  invalidJson,
  notFound,
  serverError,
  transactionNotFound,
  unauthorized,
} from "@/lib/api/errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API error helpers", () => {
  it("badRequest returns 400 VALIDATION_ERROR with per-field messages", async () => {
    const result = z.object({ name: z.string().min(1, "Wajib diisi") }).safeParse({ name: "" });
    if (result.success) throw new Error("expected failure");

    const res = badRequest(result.error);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Data tidak valid",
        fields: { name: ["Wajib diisi"] },
      },
    });
  });

  it("invalidJson returns 400 INVALID_JSON", async () => {
    const res = invalidJson();
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("unauthorized returns 401 UNAUTHORIZED", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("notFound defaults to NOT_FOUND and accepts a specific code", async () => {
    expect((await notFound().json()).error.code).toBe("NOT_FOUND");
    const res = notFound("ACCOUNT_NOT_FOUND");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("conflict returns 409 with the given code and message", async () => {
    const res = conflict("ACCOUNT_NAME_TAKEN", "Nama akun sudah dipakai");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "ACCOUNT_NAME_TAKEN", message: "Nama akun sudah dipakai" },
    });
  });

  it("serverError hides the cause from the client and logs it on the server", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = serverError(new Error("password=hunter2 leaked"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "INTERNAL", message: "Terjadi kesalahan di server" } });
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(log).toHaveBeenCalled();
  });

  it("fieldError returns 400 VALIDATION_ERROR with a message on one field", async () => {
    const res = fieldError("accountId", "Akun tidak ditemukan");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Data tidak valid",
        fields: { accountId: ["Akun tidak ditemukan"] },
      },
    });
  });

  it("transactionNotFound returns 404 TRANSACTION_NOT_FOUND", async () => {
    const res = transactionNotFound();
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("TRANSACTION_NOT_FOUND");
  });
});
