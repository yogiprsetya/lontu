import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function usersOfSwitch(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => path.relative(ROOT, path.join(entry.parentPath, entry.name)))
    .filter((file) => file !== "components/modals/archive-controls.tsx")
    .filter((file) => readFileSync(path.join(ROOT, file), "utf8").includes("ShowArchivedSwitch"))
    .sort();
}

describe('"Tampilkan arsip" switch', () => {
  it("appears only in the Settings management modals", () => {
    expect([...usersOfSwitch("app"), ...usersOfSwitch("components")]).toEqual([
      "components/modals/manage-accounts.tsx",
      "components/modals/manage-categories.tsx",
    ]);
  });
});
