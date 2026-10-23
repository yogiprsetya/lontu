import { describe, expect, it } from "vitest";
import { archiveLabel, selectableItems } from "@/lib/archived";

const active = { id: "a", name: "Kas", archivedAt: null };
const old = { id: "b", name: "Lama", archivedAt: "2026-01-01T00:00:00Z" };
const other = { id: "c", name: "Lain", archivedAt: "2026-01-01T00:00:00Z" };

describe("selectableItems", () => {
  it("offers only active items when nothing is kept", () => {
    expect(selectableItems([active, old, other])).toEqual([active]);
  });

  it("keeps the archived item that is already selected, and no other archived one", () => {
    expect(selectableItems([active, old, other], "b")).toEqual([active, old]);
  });

  it("ignores a kept id that is not in the list", () => {
    expect(selectableItems([active], "zzz")).toEqual([active]);
  });
});

describe("archiveLabel", () => {
  it("marks archived items", () => {
    expect(archiveLabel(old)).toBe("Lama (arsip)");
    expect(archiveLabel(active)).toBe("Kas");
  });
});
