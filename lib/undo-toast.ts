"use client";

import { toast } from "sonner";
import { failureMessage } from "@/lib/offline/network-error";

const UNDO_MS = 6000;

/** The toast after a delete or archive: "Urungkan" calls `restore`, and a failed restore says so. */
export function undoToast({
  message,
  restore,
  failure = "Gagal mengurungkan. Coba lagi.",
}: {
  message: string;
  restore: () => Promise<unknown>;
  failure?: string;
}) {
  toast(message, {
    duration: UNDO_MS,
    action: {
      label: "Urungkan",
      onClick: () => void restore().catch((err) => toast.error(failureMessage(err, failure))),
    },
  });
}
