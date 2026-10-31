import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/schemas/profile";

describe("profileSchema", () => {
  it("accepts a partial update and trims strings", () => {
    expect(profileSchema.parse({ displayName: "  Yogi  " })).toEqual({ displayName: "Yogi" });
  });

  it("accepts null to clear phone and location", () => {
    expect(profileSchema.parse({ phone: null, location: null })).toEqual({
      phone: null,
      location: null,
    });
  });

  it("rejects an empty display name", () => {
    const result = profileSchema.safeParse({ displayName: "   " });
    expect(result.success).toBe(false);
  });

  it("accepts IDR and rejects any other currency", () => {
    expect(profileSchema.safeParse({ currency: "IDR" }).success).toBe(true);
    expect(profileSchema.safeParse({ currency: "USD" }).success).toBe(false);
  });

  it("rejects overly long values", () => {
    expect(profileSchema.safeParse({ displayName: "a".repeat(81) }).success).toBe(false);
    expect(profileSchema.safeParse({ phone: "1".repeat(33) }).success).toBe(false);
    expect(profileSchema.safeParse({ location: "a".repeat(101) }).success).toBe(false);
  });

  it("strips fields the client may not set", () => {
    expect(
      profileSchema.parse({ email: "x@example.com", id: "other", displayName: "Yogi" }),
    ).toEqual({ displayName: "Yogi" });
  });
});
