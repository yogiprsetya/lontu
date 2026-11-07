"use client";

import { useEffect } from "react";
import { SerwistProvider } from "@serwist/next/react";
import { SWRConfig } from "swr";
import { UpdateToast } from "@/components/pwa/update-toast";
import { captureInstallPrompt } from "@/hooks/use-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { fetcher } from "@/lib/fetcher";
import { useUIStore } from "@/stores/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useUIStore.persist.rehydrate();
  }, []);

  useEffect(() => captureInstallPrompt(), []);

  return (
    // No reload on reconnect: it would throw away a half-filled form.
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      <SWRConfig value={{ fetcher }}>
        {children}
        {/* Top, so toasts never cover the bottom nav or a drawer's action buttons. */}
        <Toaster position="top-center" theme="light" />
        <UpdateToast />
      </SWRConfig>
    </SerwistProvider>
  );
}
