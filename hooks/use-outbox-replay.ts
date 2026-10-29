"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { invalidate } from "@/lib/cache-invalidation";
import { outbox } from "@/lib/offline/outbox";
import { replayOutbox, type ReplayResult } from "@/lib/offline/replay";
import { sendCreate } from "@/lib/offline/submission";

const REPLAY_EVENT = "lontu:replay";
const INTERVAL_MS = 30_000;

/** Starts a replay pass now, e.g. from "Kirim sekarang" or "Coba lagi". */
export function requestReplay() {
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

// Two tabs coming back online would otherwise both send; the client ids already stop duplicates,
// the lock just avoids the wasted requests.
async function withOutboxLock(run: () => Promise<ReplayResult>) {
  if (!navigator.locks) return run();
  return navigator.locks.request("lontu-outbox", { ifAvailable: true }, (lock) => (lock ? run() : null));
}

export function useOutboxReplay(userId: string | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const replay = async () => {
      if (!navigator.onLine) return;
      const result = await withOutboxLock(() => replayOutbox({ outbox, send: sendCreate, userId }));
      if (result?.sent) await invalidate("transactions");
      if (result?.stopped === "auth") {
        toast("Masuk lagi untuk mengirim transaksi tertunda", {
          id: "outbox-auth",
          duration: Infinity,
          classNames: { actionButton: "h-11! px-4! text-sm!" },
          action: { label: "Masuk", onClick: () => router.push("/login") },
        });
      }
    };
    const run = () => void replay().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    run();
    window.addEventListener("online", run);
    window.addEventListener(REPLAY_EVENT, run);
    document.addEventListener("visibilitychange", onVisible);
    // A pass over an empty outbox is one IndexedDB read, so the interval does not check for pending items first.
    const interval = window.setInterval(run, INTERVAL_MS);
    return () => {
      window.removeEventListener("online", run);
      window.removeEventListener(REPLAY_EVENT, run);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [userId, router]);
}
