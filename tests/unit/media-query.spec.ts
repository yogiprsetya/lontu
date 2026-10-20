import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaQueryStore } from "@/hooks/use-media-query";

function fakeMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initial,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  };
  vi.stubGlobal("window", { matchMedia: vi.fn(() => mql) });
  return {
    set(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((cb) => cb());
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createMediaQueryStore", () => {
  it("reads the current match", () => {
    fakeMatchMedia(true);
    expect(createMediaQueryStore("(min-width: 1024px)").getSnapshot()).toBe(true);
  });

  it("notifies subscribers on change and unsubscribes cleanly", () => {
    const media = fakeMatchMedia(false);
    const store = createMediaQueryStore("(min-width: 1024px)");
    const onChange = vi.fn();

    const unsubscribe = store.subscribe(onChange);
    media.set(true);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(true);

    unsubscribe();
    expect(media.listenerCount()).toBe(0);
  });

  it("assumes no match on the server so mobile renders first", () => {
    expect(createMediaQueryStore("(min-width: 1024px)").getServerSnapshot()).toBe(false);
  });
});
