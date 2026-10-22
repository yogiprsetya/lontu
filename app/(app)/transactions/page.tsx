import type { Metadata } from "next";
import { TransactionList } from "@/components/transactions/transaction-list";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
      <TransactionList />
    </main>
  );
}
