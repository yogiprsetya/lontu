import { describe, expect, it, vi } from "vitest";
import { createSelectOpenChangeHandler } from "@/components/layout/responsive-select-state";
import { readFileSync } from "node:fs";

describe("ResponsiveSelect open state", () => {
  it("closes the shared state and notifies the caller after an item selection", () => {
    let drawerOpen = true;
    const onOpenChange = vi.fn();
    const handler = createSelectOpenChangeHandler(
      false,
      (open) => {
        drawerOpen = open;
      },
      onOpenChange,
    );

    handler(false, { reason: "none" } as never);

    expect(drawerOpen).toBe(false);
    expect(onOpenChange).toHaveBeenCalledOnce();
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });

  it("leaves state controlled by the caller", () => {
    let internalState = true;
    const onOpenChange = vi.fn();
    const handler = createSelectOpenChangeHandler(
      true,
      (open) => {
        internalState = open;
      },
      onOpenChange,
    );

    handler(false, { reason: "none" } as never);

    expect(internalState).toBe(true);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });
});

describe("ResponsiveSelect content primitives", () => {
  it("reuses the shared SelectContent for desktop", () => {
    const source = readFileSync(
      new URL("../../components/layout/responsive-select.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('import { SelectContent } from "@/components/ui/select"');
    expect(source).toContain("<SelectContent alignOffset={12} sideOffset={4}");
    expect(source).not.toContain("<SelectPrimitive.Popup");
  });
});
