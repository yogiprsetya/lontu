import { describe, expect, it } from "vitest";
import { BOM, toCSV } from "@/lib/csv";

describe("toCSV", () => {
  it("starts with a UTF-8 BOM and joins rows with CRLF", () => {
    const csv = toCSV([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(BOM.length)).toBe("a,b\r\nc,d");
  });

  it("writes numbers raw and null as an empty cell", () => {
    expect(toCSV([[1500, null, "x"]]).slice(BOM.length)).toBe("1500,,x");
  });

  it("keeps a negative number untouched", () => {
    expect(toCSV([[-50000]]).slice(BOM.length)).toBe("-50000");
  });

  it.each([
    ["a,b", '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ["line1\nline2", '"line1\nline2"'],
    ["line1\r\nline2", '"line1\r\nline2"'],
  ])("escapes %j", (text, cell) => {
    expect(toCSV([[text]]).slice(BOM.length)).toBe(cell);
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"])(
    "prefixes a quote on text starting with %j",
    (text) => {
      const out = toCSV([[text]]).slice(BOM.length);
      expect(out.replace(/^"|"$/g, "")).toBe(`'${text}`);
    },
  );

  it("guards before escaping, so a formula with a comma stays one safe cell", () => {
    expect(toCSV([["=A1,B1"]]).slice(BOM.length)).toBe(`"'=A1,B1"`);
  });

  it("does not touch ordinary text or text with a leading digit", () => {
    expect(toCSV([["Makan siang", "2026-10-01"]]).slice(BOM.length)).toBe("Makan siang,2026-10-01");
  });

  it("keeps Indonesian text as is", () => {
    expect(toCSV([["Penyesuaian — Rp"]]).slice(BOM.length)).toBe("Penyesuaian — Rp");
  });
});
