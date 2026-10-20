import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
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

  return (
    <PlaceholderPage
      title={`Tambah ${TRANSACTION_TYPE_LABELS[type]}`}
      icon={PlusIcon}
      description="Form transaksi menyusul di modul transactions."
    />
  );
}
