"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { invalidate } from "@/lib/cache-invalidation";
import { outbox } from "@/lib/offline/outbox";
import { outboxLock, startReplay } from "@/lib/offline/replay";
import { sendCreate } from "@/lib/offline/submission";

export function useOutboxReplay(userId: string | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const onAuthLost = () =>
      toast("Masuk lagi untuk mengirim transaksi tertunda", {
        id: "outbox-auth",
        duration: Infinity,
        classNames: { actionButton: "h-11! px-4! text-sm!" },
        action: { label: "Masuk", onClick: () => router.push("/login") },
      });
    const isOnline = () => navigator.onLine;
    const onSent = () => invalidate("transactions");
    return startReplay({
      userId,
      outbox,
      send: sendCreate,
      target: window,
      page: document,
      isOnline,
      lock: outboxLock,
      onSent,
      onAuthLost,
    });
  }, [userId, router]);
}
