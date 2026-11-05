import type { Metadata } from "next";
import { Suspense } from "react";
import { NetWorthView } from "@/components/net-worth/net-worth-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PageTitle } from "@/components/layout/page-title";

export const metadata: Metadata = { title: "Net Worth" };

export default function NetWorthPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <PageTitle>Net Worth</PageTitle>
      <Suspense fallback={<PageSkeleton />}>
        <NetWorthView />
      </Suspense>
    </main>
  );
}
