import { Suspense } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RequireSession } from "@/components/layout/require-session";
import { Sidebar } from "@/components/layout/sidebar";
import { ModalHost } from "@/components/modals/modal-host";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Suspense fallback={<PageSkeleton />}>
          <RequireSession>{children}</RequireSession>
        </Suspense>
      </div>
      <BottomNav />
      <ModalHost />
    </div>
  );
}
