"use client";

import { useState, useSyncExternalStore } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { installPromptState, isIOSSafari } from "@/lib/offline/install";
import { useUIStore } from "@/stores/ui";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const promptStore = {
  subscribe(onChange: () => void) {
    listeners.add(onChange);
    return () => void listeners.delete(onChange);
  },
  getSnapshot: () => deferredPrompt,
  getServerSnapshot: () => null,
};

/**
 * Called once from Providers: the browser can fire beforeinstallprompt before the dashboard
 * renders, so the event is kept at module level.
 */
export function captureInstallPrompt() {
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferredPrompt = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

const noopSubscribe = () => () => {};

function useIsIOSSafari() {
  return useSyncExternalStore(noopSubscribe, () => isIOSSafari(navigator.userAgent), () => false);
}

// Until the persisted store loads, an earlier "Nanti" is unknown, so the card stays hidden.
function useUIStoreHydrated() {
  return useSyncExternalStore(
    (onChange) => useUIStore.persist.onFinishHydration(onChange),
    () => useUIStore.persist.hasHydrated(),
    () => false,
  );
}

export function useInstallPrompt() {
  const promptEvent = useSyncExternalStore(promptStore.subscribe, promptStore.getSnapshot, promptStore.getServerSnapshot);
  const standalone = useMediaQuery("(display-mode: standalone)");
  const iosSafari = useIsIOSSafari();
  const hydrated = useUIStoreHydrated();
  const dismissedAt = useUIStore((s) => s.installDismissedAt);
  const dismiss = useUIStore((s) => s.dismissInstall);
  const [now] = useState(() => Date.now());

  const state = hydrated
    ? installPromptState({ standalone, isIOSSafari: iosSafari, hasPromptEvent: !!promptEvent, dismissedAt, now })
    : "hidden";

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    // A prompt event can be used only once.
    deferredPrompt = null;
    notify();
  }

  return { state, install, dismiss: () => dismiss() };
}
