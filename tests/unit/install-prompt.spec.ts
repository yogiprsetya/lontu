import { describe, expect, it } from "vitest";
import { installPromptState, isIOSSafari } from "@/lib/offline/install";

const NOW = Date.parse("2026-10-25T03:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const base = { standalone: false, isIOSSafari: false, hasPromptEvent: false, dismissedAt: null, now: NOW };

describe("installPromptState", () => {
  it("is hidden inside the installed app", () => {
    expect(installPromptState({ ...base, standalone: true, hasPromptEvent: true })).toBe("hidden");
  });

  it("offers the prompt when the browser fired beforeinstallprompt", () => {
    expect(installPromptState({ ...base, hasPromptEvent: true })).toBe("prompt");
  });

  it("shows instructions on iOS Safari, which has no prompt event", () => {
    expect(installPromptState({ ...base, isIOSSafari: true })).toBe("ios-instructions");
  });

  it("is hidden without an event on other browsers", () => {
    expect(installPromptState(base)).toBe("hidden");
  });

  it("stays hidden for 30 days after Nanti", () => {
    expect(installPromptState({ ...base, hasPromptEvent: true, dismissedAt: NOW - 29 * DAY })).toBe("hidden");
    expect(installPromptState({ ...base, hasPromptEvent: true, dismissedAt: NOW - 31 * DAY })).toBe("prompt");
  });
});

describe("isIOSSafari", () => {
  it.each([
    ["iPhone Safari", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", true],
    ["iPad Safari", "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", true],
    ["Chrome on iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1", false],
    ["Firefox on iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15", false],
    ["Android Chrome", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", false],
    ["macOS Safari", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", false],
  ])("%s → %s", (_, ua, expected) => {
    expect(isIOSSafari(ua)).toBe(expected);
  });
});
