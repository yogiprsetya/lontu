"use client";

import { useEffect } from "react";
import { useSerwist } from "@serwist/next/react";
import { toast } from "sonner";

export function UpdateToast() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;
    const reload = () => window.location.reload();
    const onWaiting = () => {
      // Persistent and opt-in: reloading by itself could throw away a half-filled form.
      toast("Versi baru tersedia", {
        id: "sw-update",
        duration: Infinity,
        classNames: { actionButton: "h-11! px-4! text-sm!" },
        action: {
          label: "Muat ulang",
          onClick: () => {
            serwist.addEventListener("controlling", reload);
            serwist.messageSkipWaiting();
          },
        },
      });
    };
    serwist.addEventListener("waiting", onWaiting);
    return () => {
      serwist.removeEventListener("waiting", onWaiting);
      serwist.removeEventListener("controlling", reload);
    };
  }, [serwist]);

  return null;
}
