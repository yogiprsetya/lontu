"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ModalId = "manageAccounts" | "manageCategories" | "signOut";

type UIState = {
  modal: ModalId | null;
  modalProps?: Record<string, unknown>;
  open: (modal: ModalId, props?: Record<string, unknown>) => void;
  close: () => void;
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  /** Epoch ms of the last "Nanti" on the install card. */
  installDismissedAt: number | null;
  dismissInstall: (now?: number) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      modal: null,
      modalProps: undefined,
      open: (modal, modalProps) => set({ modal, modalProps }),
      close: () => set({ modal: null, modalProps: undefined }),
      hideAmounts: false,
      toggleHideAmounts: () => set((s) => ({ hideAmounts: !s.hideAmounts })),
      installDismissedAt: null,
      dismissInstall: (now = Date.now()) => set({ installDismissedAt: now }),
    }),
    {
      name: "lontu-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ hideAmounts: s.hideAmounts, installDismissedAt: s.installDismissedAt }),
      // Rehydrated in Providers after mount so the server render and first client render match.
      skipHydration: true,
    },
  ),
);
