import { describe, expect, it } from "vitest";
import { isActivePath } from "@/components/layout/nav-items";

describe("isActivePath", () => {
  it("matches the exact path", () => {
    expect(isActivePath("/dashboard", "/dashboard")).toBe(true);
  });

  it("matches nested paths", () => {
    expect(isActivePath("/transactions/abc", "/transactions")).toBe(true);
  });

  it("does not match a sibling that shares a prefix", () => {
    expect(isActivePath("/budgets", "/budget")).toBe(false);
  });

  it("does not match another section", () => {
    expect(isActivePath("/settings", "/dashboard")).toBe(false);
  });
});
