import type { Metadata } from "next";
import { Suspense } from "react";
import { WalletIcon } from "lucide-react";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Masuk" };

const errorMessages: Record<string, string> = {
  AccessDenied: "Email ini tidak punya akses ke Lontu.",
};

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;
  return (
    <p
      role="alert"
      className="rounded-2xl bg-peach px-4 py-3 text-sm font-semibold text-peach-foreground"
    >
      {errorMessages[error] ?? "Login gagal. Coba lagi."}
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <span
          aria-hidden
          className="flex size-16 items-center justify-center rounded-2xl bg-sunny text-sunny-foreground shadow-soft ring-4 ring-card"
        >
          <WalletIcon className="size-8" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-5xl font-extrabold tracking-tight">Lontu</h1>
          <p className="text-lg font-semibold text-muted-foreground">
            Catatan keuangan pribadi. Masuk untuk melanjutkan.
          </p>
        </div>
        <Suspense>
          <LoginError searchParams={searchParams} />
        </Suspense>
        <div className="flex flex-col gap-3 rounded-[1.75rem] bg-sunny bg-dots px-5 py-5 text-sunny-foreground shadow-soft">
          <p className="text-xs font-bold tracking-[0.14em] text-sunny-muted-foreground uppercase">
            Selamat datang
          </p>
          <p className="font-heading text-xl font-bold">
            Income, expense, saving, dan budget dalam satu catatan.
          </p>
          <GoogleSignInButton />
        </div>
      </div>
    </main>
  );
}
