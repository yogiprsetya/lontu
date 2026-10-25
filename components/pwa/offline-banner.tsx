"use client";

import { WifiOffIcon } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <div role="status">
      {!online && (
        <p className="flex items-center gap-2 bg-muted px-4 py-2 text-sm text-foreground lg:px-8">
          <WifiOffIcon className="size-4 shrink-0" aria-hidden />
          Offline · menampilkan data tersimpan terakhir
        </p>
      )}
    </div>
  );
}
