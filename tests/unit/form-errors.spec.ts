import { describe, expect, it, vi } from "vitest";
import { applyServerErrors } from "@/lib/form-errors";
import { ApiError } from "@/lib/fetcher";

describe("applyServerErrors", () => {
  it("sets the first message of each field error", () => {
    const setError = vi.fn();
    const err = new ApiError(400, "VALIDATION_ERROR", "Data tidak valid", { name: ["Wajib", "Lain"], type: ["Salah"] });

    expect(applyServerErrors(err, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith("name", { message: "Wajib" });
    expect(setError).toHaveBeenCalledWith("type", { message: "Salah" });
  });

  it("puts a 409 conflict message on the name field", () => {
    const setError = vi.fn();
    const err = new ApiError(409, "ACCOUNT_NAME_TAKEN", "Nama akun sudah dipakai.");

    expect(applyServerErrors(err, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith("name", { message: "Nama akun sudah dipakai." });
  });

  it("leaves other errors to the caller", () => {
    const setError = vi.fn();

    expect(applyServerErrors(new ApiError(500, "INTERNAL", "Gagal"), setError)).toBe(false);
    expect(applyServerErrors(new TypeError("Failed to fetch"), setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
