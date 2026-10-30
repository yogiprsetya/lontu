export type InstallPromptState = "hidden" | "prompt" | "ios-instructions";

const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export function installPromptState({
  standalone,
  isIOSSafari,
  hasPromptEvent,
  dismissedAt,
  now,
}: {
  standalone: boolean;
  isIOSSafari: boolean;
  hasPromptEvent: boolean;
  dismissedAt: number | null;
  now: number;
}): InstallPromptState {
  if (standalone) return "hidden";
  if (dismissedAt !== null && now - dismissedAt < SNOOZE_MS) return "hidden";
  if (hasPromptEvent) return "prompt";
  return isIOSSafari ? "ios-instructions" : "hidden";
}

// Chrome and Firefox on iOS are WebKit too but cannot add to the home screen the same way.
export function isIOSSafari(userAgent: string) {
  return (
    /iPhone|iPad|iPod/.test(userAgent) &&
    /Safari\//.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS/.test(userAgent)
  );
}
