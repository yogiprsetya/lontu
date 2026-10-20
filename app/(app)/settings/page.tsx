import type { Metadata } from "next";
import { FinanceSection } from "@/components/settings/finance-section";
import { LogoutButton } from "@/components/settings/logout-button";
import { ProfileSection } from "@/components/settings/profile-form";
import { ThemeToggle } from "@/components/settings/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`settings-${title}`} className="flex flex-col gap-4">
      <h2 id={`settings-${title}`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Section title="Profil">
        <ProfileSection />
      </Section>
      <Section title="Keuangan">
        <FinanceSection />
      </Section>
      <Section title="Tampilan">
        <ThemeToggle />
      </Section>
      <LogoutButton />
    </main>
  );
}
