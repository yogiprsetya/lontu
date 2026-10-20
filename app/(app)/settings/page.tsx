import type { Metadata } from "next";
import { SettingsIcon } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ManageAccountsPlaceholder } from "@/components/settings/manage-accounts-placeholder";
import { ThemeToggle } from "@/components/settings/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PlaceholderPage title="Settings" icon={SettingsIcon} description="Akun, kategori, dan profil akan diatur di sini.">
      <ManageAccountsPlaceholder />
      <ThemeToggle />
    </PlaceholderPage>
  );
}
