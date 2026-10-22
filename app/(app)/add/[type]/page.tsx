import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { TransactionForm } from "@/components/forms/transaction-form";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
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

  const title = `Tambah ${TRANSACTION_TYPE_LABELS[type]}`;
  if (type === "transfer") {
    return <PlaceholderPage title={title} icon={PlusIcon} description="Form transfer menyusul." />;
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <TransactionForm type={type} />
    </main>
  );
}
