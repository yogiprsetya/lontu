"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/sonner";
import { fetcher } from "@/lib/fetcher";
import { useUIStore } from "@/stores/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useUIStore.persist.rehydrate();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRConfig value={{ fetcher }}>
        {children}
        {/* Top, so toasts never cover the bottom nav or a drawer's action buttons. */}
        <Toaster position="top-center" />
      </SWRConfig>
    </ThemeProvider>
  );
}
