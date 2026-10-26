import { afterEach, describe, expect, it, vi } from "vitest";
import { onlineStore } from "@/hooks/use-online-status";

function fakeWindow(initial: boolean) {
  const listeners = new Map<string, Set<() => void>>();
  const navigator = { onLine: initial };
  vi.stubGlobal("navigator", navigator);
  vi.stubGlobal("window", {
    addEventListener: (type: string, cb: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener: (type: string, cb: () => void) => listeners.get(type)?.delete(cb),
  });
  return {
    set(onLine: boolean) {
      navigator.onLine = onLine;
      listeners.get(onLine ? "online" : "offline")?.forEach((cb) => cb());
    },
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("onlineStore", () => {
  it("reads navigator.onLine", () => {
    fakeWindow(false);
    expect(onlineStore.getSnapshot()).toBe(false);
  });

  it("notifies on offline and online, and unsubscribes cleanly", () => {
    const win = fakeWindow(true);
    const onChange = vi.fn();

    const unsubscribe = onlineStore.subscribe(onChange);
    win.set(false);
    expect(onlineStore.getSnapshot()).toBe(false);
    win.set(true);

    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(win.listenerCount()).toBe(0);
  });

  it("assumes online on the server so no offline UI flashes", () => {
    expect(onlineStore.getServerSnapshot()).toBe(true);
  });
});
