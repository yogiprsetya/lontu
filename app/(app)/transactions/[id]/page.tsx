import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TransactionEditor } from "@/components/transactions/transaction-editor";

export const metadata: Metadata = { title: "Ubah transaksi" };

export default async function EditTransactionPage({ params }: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Ubah transaksi</h1>
      <TransactionEditor id={id} />
    </main>
  );
}
