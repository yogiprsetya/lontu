import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PageTitle } from "@/components/layout/page-title";
import { RecurringView } from "@/components/recurring/recurring-view";

export const metadata: Metadata = { title: "Recurring" };

export default function RecurringPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <PageTitle>Recurring</PageTitle>
      <Suspense fallback={<PageSkeleton />}>
        <RecurringView />
      </Suspense>
    </main>
  );
}
