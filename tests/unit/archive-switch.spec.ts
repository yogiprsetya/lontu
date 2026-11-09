import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function usersOfSwitch(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => path.relative(ROOT, path.join(entry.parentPath, entry.name)))
    .filter((file) => readFileSync(path.join(ROOT, file), "utf8").includes("Tampilkan arsip"));
}

describe('"Tampilkan arsip" switch', () => {
  it("is gone: archived items are only listed in Settings → Arsip", () => {
    expect([...usersOfSwitch("app"), ...usersOfSwitch("components")]).toEqual([]);
  });
});
