"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ModalId = "manageAccounts" | "manageCategories";

type UIState = {
  modal: ModalId | null;
  modalProps?: Record<string, unknown>;
  open: (modal: ModalId, props?: Record<string, unknown>) => void;
  close: () => void;
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
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
    }),
    {
      name: "lontu-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ hideAmounts: s.hideAmounts }),
      // Rehydrated in Providers after mount so the server render and first client render match.
      skipHydration: true,
    },
  ),
);
