"use client";

import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function LoadError({ onRetry, message = "Gagal memuat data." }: { onRetry: () => void; message?: string }) {
  // Offline, an SWR error means the service worker had nothing cached for this request.
  const online = useOnlineStatus();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 surface px-5 py-5">
      <p className="text-sm text-muted-foreground">{online ? message : "Belum ada data tersimpan untuk tampilan ini."}</p>
      <Button variant="outline" className="h-11 text-base" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  );
}
