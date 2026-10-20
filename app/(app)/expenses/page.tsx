import type { Metadata } from "next";
import { ReceiptIcon } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <PlaceholderPage title="Expenses" icon={ReceiptIcon} description="Belum ada pengeluaran yang tercatat." />
  );
}
