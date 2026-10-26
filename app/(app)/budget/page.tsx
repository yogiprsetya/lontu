import type { Metadata } from "next";
import { Suspense } from "react";
import { BudgetView } from "@/components/budgets/budget-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const metadata: Metadata = { title: "Budget" };

export default function BudgetPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Budget</h1>
      <Suspense fallback={<PageSkeleton />}>
        <BudgetView />
      </Suspense>
    </main>
  );
}
