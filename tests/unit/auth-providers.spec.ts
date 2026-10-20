import { describe, expect, it } from "vitest";
import { buildProviders, isE2EAuthEnabled } from "@/lib/auth/providers";

// Auth.js merges a provider's `options` over its defaults at runtime; resolve ids the same way.
const ids = (env: Parameters<typeof buildProviders>[0]) =>
  buildProviders(env).map((p) => {
    const config = (typeof p === "function" ? p() : p) as { id: string; options?: { id?: string } };
    return config.options?.id ?? config.id;
  });

describe("isE2EAuthEnabled", () => {
  it("is on only with E2E_AUTH=1 outside production", () => {
    expect(isE2EAuthEnabled({ E2E_AUTH: "1", NODE_ENV: "development" })).toBe(true);
    expect(isE2EAuthEnabled({ E2E_AUTH: "1", NODE_ENV: "test" })).toBe(true);
  });

  it("is off when E2E_AUTH is unset, empty, or not 1", () => {
    expect(isE2EAuthEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isE2EAuthEnabled({ E2E_AUTH: "", NODE_ENV: "development" })).toBe(false);
    expect(isE2EAuthEnabled({ E2E_AUTH: "true", NODE_ENV: "development" })).toBe(false);
  });

  it("is off in production even with E2E_AUTH=1", () => {
    expect(isE2EAuthEnabled({ E2E_AUTH: "1", NODE_ENV: "production" })).toBe(false);
  });
});

describe("buildProviders", () => {
  it("registers only Google by default", () => {
    expect(ids({ NODE_ENV: "development" })).toEqual(["google"]);
  });

  it("does not register the test provider in production", () => {
    expect(ids({ E2E_AUTH: "1", NODE_ENV: "production" })).toEqual(["google"]);
  });

  it("adds the e2e credentials provider when enabled", () => {
    expect(ids({ E2E_AUTH: "1", NODE_ENV: "development" })).toEqual(["google", "e2e"]);
  });
});
