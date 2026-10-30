import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

function pngSize(publicPath: string) {
  const buf = readFileSync(new URL(`../../public${publicPath}`, import.meta.url));
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

describe("web app manifest", () => {
  const m = manifest();

  it("has the fields required to be installable", () => {
    expect(m).toMatchObject({
      name: "Lontu",
      short_name: "Lontu",
      display: "standalone",
      start_url: "/dashboard",
      scope: "/",
    });
    expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("declares 192 and 512 any-purpose icons and a maskable icon", () => {
    const icons = m.icons ?? [];
    expect(icons.filter((i) => (i.purpose ?? "any") === "any").map((i) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    expect(icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512")).toBe(true);
  });

  it("points every icon at a PNG whose real size matches the declared size", () => {
    for (const icon of m.icons ?? []) {
      expect(icon.type).toBe("image/png");
      expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  });

  it("offers a Tambah Expense shortcut", () => {
    expect(m.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Tambah Expense", url: "/add/expense" }),
      ]),
    );
  });
});
