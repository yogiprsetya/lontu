"use client";

import { WifiOffIcon } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOutbox } from "@/hooks/use-outbox";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const pending = useOutbox().length;
  return (
    <div role="status">
      {!online && (
        <p className="flex items-center gap-2 bg-muted px-4 py-2 text-sm text-foreground lg:px-8">
          <WifiOffIcon className="size-4 shrink-0" aria-hidden />
          Offline · menampilkan data tersimpan terakhir
          {pending > 0 && ` · ${pending} tertunda`}
        </p>
      )}
    </div>
  );
}
