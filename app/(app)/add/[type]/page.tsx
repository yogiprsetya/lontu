import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/forms/transaction-form";
import { TransferForm } from "@/components/forms/transfer-form";
import { TypeChip } from "@/components/transactions/type-chip";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS, isTransactionType } from "@/lib/transaction-types";

export function generateStaticParams() {
  return TRANSACTION_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: PageProps<"/add/[type]">): Promise<Metadata> {
  const { type } = await params;
  return { title: isTransactionType(type) ? `Tambah ${TRANSACTION_TYPE_LABELS[type]}` : undefined };
}

export default async function AddTransactionPage({ params }: PageProps<"/add/[type]">) {
  const { type } = await params;
  if (!isTransactionType(type)) notFound();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <h1 className="flex items-center gap-3 font-heading text-3xl font-extrabold tracking-tight">
        <TypeChip type={type} />
        Tambah {TRANSACTION_TYPE_LABELS[type]}
      </h1>
      {type === "transfer" ? <TransferForm /> : <TransactionForm type={type} />}
    </main>
  );
}
