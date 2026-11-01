import type { Metadata } from "next";
import { Suspense } from "react";
import { GoalsView } from "@/components/goals/goals-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PageTitle } from "@/components/layout/page-title";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <PageTitle>Goals</PageTitle>
      <Suspense fallback={<PageSkeleton />}>
        <GoalsView />
      </Suspense>
    </main>
  );
}
