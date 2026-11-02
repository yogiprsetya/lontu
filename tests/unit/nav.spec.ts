import { describe, expect, it } from "vitest";
import {
  isActivePath,
  moreItems,
  netWorthItem,
  recurringItem,
  sidebarItems,
} from "@/components/layout/nav-items";

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

describe("recurring nav item", () => {
  it("is in the sidebar and the bottom nav More menu", () => {
    expect(sidebarItems).toContain(recurringItem);
    expect(moreItems).toContain(recurringItem);
    expect(recurringItem).toMatchObject({ href: "/recurring", label: "Recurring" });
  });
});

describe("net worth nav item", () => {
  it("is in the sidebar and the bottom nav More menu", () => {
    expect(sidebarItems).toContain(netWorthItem);
    expect(moreItems).toContain(netWorthItem);
    expect(netWorthItem).toMatchObject({ href: "/net-worth", label: "Net Worth" });
  });
});
