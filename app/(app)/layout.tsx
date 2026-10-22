import { Suspense } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RequireSession } from "@/components/layout/require-session";
import { Sidebar } from "@/components/layout/sidebar";
import { ModalHost } from "@/components/modals/modal-host";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      {/* usePathname is unknown at prerender on dynamic routes such as /transactions/[id]. */}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Suspense fallback={<PageSkeleton />}>
          <RequireSession>{children}</RequireSession>
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <ModalHost />
    </div>
  );
}
