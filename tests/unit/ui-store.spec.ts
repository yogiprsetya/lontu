import { beforeAll, describe, expect, it, vi } from "vitest";
import type { useUIStore as UIStore } from "@/stores/ui";

let useUIStore: typeof UIStore;

beforeAll(async () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  ({ useUIStore } = await import("@/stores/ui"));
});

describe("useUIStore", () => {
  it("opens and closes a modal with props", () => {
    useUIStore.getState().open("manageAccounts", { focusId: "a1" });
    expect(useUIStore.getState()).toMatchObject({
      modal: "manageAccounts",
      modalProps: { focusId: "a1" },
    });

    useUIStore.getState().close();
    expect(useUIStore.getState()).toMatchObject({ modal: null, modalProps: undefined });
  });

  it("toggles hideAmounts", () => {
    const before = useUIStore.getState().hideAmounts;
    useUIStore.getState().toggleHideAmounts();
    expect(useUIStore.getState().hideAmounts).toBe(!before);
  });

  it("persists only hideAmounts and installDismissedAt", () => {
    useUIStore.getState().open("manageCategories");

    const stored = JSON.parse(localStorage.getItem("lontu-ui") ?? "{}");

    expect(stored.state).toEqual({
      hideAmounts: useUIStore.getState().hideAmounts,
      installDismissedAt: useUIStore.getState().installDismissedAt,
    });
  });

  it("records when the install card was dismissed", () => {
    useUIStore.getState().dismissInstall(1_000);
    expect(useUIStore.getState().installDismissedAt).toBe(1_000);
  });
});
