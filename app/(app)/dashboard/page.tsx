import type { Metadata } from "next";
import { LayoutDashboardIcon } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      icon={LayoutDashboardIcon}
      description="Ringkasan saldo, pengeluaran, dan budget akan tampil di sini."
    />
  );
}
