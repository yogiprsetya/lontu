import type { Metadata } from "next";
import { WalletIcon } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Budget" };

export default function BudgetPage() {
  return (
    <PlaceholderPage title="Budget" icon={WalletIcon} description="Belum ada budget untuk bulan ini." />
  );
}
