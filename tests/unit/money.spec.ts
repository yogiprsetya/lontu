import { describe, expect, it } from "vitest";
import { abbreviateIDR, displayAmount, formatIDR, formatThousands, HIDDEN_AMOUNT, parseIDR } from "@/lib/money";

describe("formatIDR", () => {
  it("formats rupiah with dot thousands separator and no space", () => {
    expect(formatIDR(10000)).toBe("Rp10.000");
  });

  it("formats zero", () => {
    expect(formatIDR(0)).toBe("Rp0");
  });

  it("formats negative amounts with a leading minus", () => {
    expect(formatIDR(-5000)).toBe("-Rp5.000");
  });

  it("formats the 1e12 maximum", () => {
    expect(formatIDR(1_000_000_000_000)).toBe("Rp1.000.000.000.000");
  });
});

describe("parseIDR", () => {
  it("parses dot-grouped input", () => {
    expect(parseIDR("10.000")).toBe(10000);
  });

  it("ignores the Rp prefix and whitespace", () => {
    expect(parseIDR("Rp 1.250.000")).toBe(1250000);
  });

  it("returns null for empty input", () => {
    expect(parseIDR("")).toBeNull();
    expect(parseIDR("   ")).toBeNull();
  });

  it("returns null when there are no digits", () => {
    expect(parseIDR("abc")).toBeNull();
  });

  it("drops non-digit characters mixed into digits", () => {
    expect(parseIDR("12a34")).toBe(1234);
  });
});

describe("formatThousands", () => {
  it("groups a number with dots", () => {
    expect(formatThousands(1234567)).toBe("1.234.567");
  });

  it("regroups raw input text, dropping non-digits", () => {
    expect(formatThousands("12345a")).toBe("12.345");
    expect(formatThousands("1.0000")).toBe("10.000");
  });

  it("returns an empty string for input without digits", () => {
    expect(formatThousands("")).toBe("");
  });
});

describe("abbreviateIDR", () => {
  it("leaves amounts below one thousand as is", () => {
    expect(abbreviateIDR(999)).toBe("999");
  });

  it("uses rb from one thousand", () => {
    expect(abbreviateIDR(1000)).toBe("1 rb");
    expect(abbreviateIDR(1500)).toBe("1,5 rb");
  });

  it("truncates instead of rounding so 999.999 stays in rb", () => {
    expect(abbreviateIDR(999_999)).toBe("999,9 rb");
  });

  it("uses jt from one million", () => {
    expect(abbreviateIDR(1_000_000)).toBe("1 jt");
    expect(abbreviateIDR(1_200_000)).toBe("1,2 jt");
  });

  it("uses M from one billion", () => {
    expect(abbreviateIDR(1_000_000_000)).toBe("1 M");
  });

  it("uses T from one trillion", () => {
    expect(abbreviateIDR(1_000_000_000_000)).toBe("1 T");
  });

  it("keeps the sign for negative amounts", () => {
    expect(abbreviateIDR(-1_200_000)).toBe("-1,2 jt");
  });
});

describe("displayAmount", () => {
  it("hides any amount behind HIDDEN_AMOUNT", () => {
    expect(displayAmount(1500, true)).toBe(HIDDEN_AMOUNT);
    expect(displayAmount(-2e6, true, abbreviateIDR)).toBe(HIDDEN_AMOUNT);
  });

  it("formats with formatIDR by default", () => {
    expect(displayAmount(1500, false)).toBe(formatIDR(1500));
  });

  it("uses the given formatter when shown", () => {
    expect(displayAmount(-2e6, false, abbreviateIDR)).toBe(abbreviateIDR(-2e6));
    expect(displayAmount(1500, false, (n) => `+${formatIDR(n)}`)).toBe(`+${formatIDR(1500)}`);
  });
});
