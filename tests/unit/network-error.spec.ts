import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/fetcher";
import { isNetworkError } from "@/lib/offline/network-error";

describe("isNetworkError", () => {
  it.each([
    ["a rejected fetch", new TypeError("Failed to fetch")],
    ["an aborted request", new DOMException("The operation was aborted.", "AbortError")],
    ["a timed-out request", new DOMException("The operation timed out.", "TimeoutError")],
  ])("is true for %s", (_, err) => {
    expect(isNetworkError(err)).toBe(true);
  });

  it.each([
    ["a 400", new ApiError(400, "VALIDATION_ERROR", "Data tidak valid")],
    ["a 500", new ApiError(500, "INTERNAL", "Terjadi kesalahan di server")],
    ["a plain error", new Error("boom")],
    ["a non-error", "offline"],
  ])("is false for %s", (_, err) => {
    expect(isNetworkError(err)).toBe(false);
  });
});
