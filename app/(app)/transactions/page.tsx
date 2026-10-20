import type { Metadata } from "next";
import { ArrowLeftRightIcon } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <PlaceholderPage
      title="Transactions"
      icon={ArrowLeftRightIcon}
      description="Belum ada transaksi. Tekan + untuk mencatat yang pertama."
    />
  );
}
