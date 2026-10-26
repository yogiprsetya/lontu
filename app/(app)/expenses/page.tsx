import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Expenses</h1>
      <Suspense fallback={<PageSkeleton />}>
        <TransactionsView lockedType="expense" />
      </Suspense>
    </main>
  );
}
