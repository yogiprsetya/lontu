import { describe, expect, it } from "vitest";
import { moneyFromInput, moneyToInput } from "@/lib/money-input";

describe("moneyFromInput", () => {
  it("parses grouped digits", () => {
    expect(moneyFromInput("1.250.000", false)).toBe(1_250_000);
  });

  it("applies the sign toggle", () => {
    expect(moneyFromInput("1.250.000", true)).toBe(-1_250_000);
  });

  it("treats empty input as 0, never -0", () => {
    expect(moneyFromInput("", false)).toBe(0);
    expect(Object.is(moneyFromInput("", true), 0)).toBe(true);
  });

  it("ignores stray characters such as a typed minus or Rp", () => {
    expect(moneyFromInput("Rp-2.500", false)).toBe(2_500);
  });
});

describe("moneyToInput", () => {
  it("formats the absolute value with thousand separators", () => {
    expect(moneyToInput(-250_000)).toBe("250.000");
    expect(moneyToInput(1_250_000)).toBe("1.250.000");
  });

  it("shows 0 as an empty field", () => {
    expect(moneyToInput(0)).toBe("");
  });
});
