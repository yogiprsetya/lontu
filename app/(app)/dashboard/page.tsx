import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Greeting } from "@/components/dashboard/greeting";
import { HideAmountsButton } from "@/components/dashboard/hide-amounts-button";
import { SettingsButton } from "@/components/dashboard/settings-button";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="flex items-center justify-between gap-2">
        <Greeting />
        <div className="flex shrink-0 gap-2">
          <HideAmountsButton />
          <SettingsButton />
        </div>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <DashboardView />
      </Suspense>
    </main>
  );
}
