import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";
import { FinanceSection } from "@/components/settings/finance-section";
import { LogoutButton } from "@/components/settings/logout-button";
import { ProfileSection } from "@/components/settings/profile-form";
import { ThemeToggle } from "@/components/settings/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`settings-${title}`} className="flex flex-col gap-3">
      <h2 id={`settings-${title}`} className="font-heading text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6 lg:px-8">
      <PageTitle>Settings</PageTitle>
      <Section title="Profil">
        <div className="surface px-5 py-5">
          <ProfileSection />
        </div>
      </Section>
      <Section title="Keuangan">
        <div className="surface px-5 py-5">
          <FinanceSection />
        </div>
      </Section>
      <Section title="Tampilan">
        <ThemeToggle />
      </Section>
      <LogoutButton />
    </main>
  );
}
