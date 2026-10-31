import { describe, expect, it } from "vitest";
import { isAllowedSignIn } from "@/lib/auth/allowlist";

describe("isAllowedSignIn", () => {
  it("allows a verified email on the list", () => {
    expect(
      isAllowedSignIn({ email: "yogi@example.com", emailVerified: true }, "yogi@example.com"),
    ).toBe(true);
  });

  it("trims spaces and ignores case on both sides", () => {
    const list = " Other@Example.com ,  YOGI@example.com ";
    expect(isAllowedSignIn({ email: "yogi@EXAMPLE.com", emailVerified: true }, list)).toBe(true);
  });

  it("rejects an email that is not on the list", () => {
    expect(
      isAllowedSignIn({ email: "eve@example.com", emailVerified: true }, "yogi@example.com"),
    ).toBe(false);
  });

  it("rejects everyone when the list is empty or unset", () => {
    expect(isAllowedSignIn({ email: "yogi@example.com", emailVerified: true }, "")).toBe(false);
    expect(isAllowedSignIn({ email: "yogi@example.com", emailVerified: true }, undefined)).toBe(
      false,
    );
  });

  it("does not let an empty entry match a missing email", () => {
    expect(isAllowedSignIn({ email: "", emailVerified: true }, "yogi@example.com,,")).toBe(false);
    expect(isAllowedSignIn({ email: null, emailVerified: true }, "yogi@example.com")).toBe(false);
  });

  it("rejects an unverified email even when listed", () => {
    expect(
      isAllowedSignIn({ email: "yogi@example.com", emailVerified: false }, "yogi@example.com"),
    ).toBe(false);
  });
});
