import type { Metadata } from "next";
import Link from "next/link";
import { WifiOffIcon } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Offline" };

// Served by the service worker for navigations it has no cached copy of, so it must stay static.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-start gap-4">
        <WifiOffIcon className="size-8 text-muted-foreground" aria-hidden />
        <PageTitle>Kamu sedang offline</PageTitle>
        <p className="text-muted-foreground">Halaman ini belum pernah dibuka di perangkat ini.</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Link href="/dashboard" className={cn(buttonVariants(), "h-11 text-base")}>
            Ke Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
