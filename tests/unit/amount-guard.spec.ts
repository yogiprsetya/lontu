import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

// The two toggles are the only components allowed to read the flag itself.
const ALLOWED = new Set([
  "components/settings/finance-section.tsx",
  "components/dashboard/hide-amounts-button.tsx",
]);

function files(dir: string, match: (name: string) => boolean): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && match(entry.name))
    .map((entry) => path.relative(ROOT, path.join(entry.parentPath, entry.name)));
}

const SOURCES = [
  ...files("components", (name) => name.endsWith(".tsx")),
  ...files("lib", (name) => name.endsWith("-format.ts")),
].filter((file) => !ALLOWED.has(file));

describe("hidden amounts guard", () => {
  it("scans the screens and format helpers", () => {
    expect(SOURCES.length).toBeGreaterThan(20);
  });

  it.each(SOURCES)("%s leaves hiding to useAmountFormat", (file) => {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const offending = ["hideAmounts", "HIDDEN_AMOUNT"].filter((name) => source.includes(name));
    expect(
      offending,
      `${file} mentions ${offending.join(", ")}. Format amounts with useAmountFormat() (or useAmountsHidden() for non-text) from @/hooks/use-amount-format.`,
    ).toEqual([]);
  });
});
