import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Masuk" };

const errorMessages: Record<string, string> = {
  AccessDenied: "Email ini tidak punya akses ke Lontu.",
};

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {errorMessages[error] ?? "Login gagal. Coba lagi."}
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Lontu</h1>
          <p className="text-muted-foreground">Catatan keuangan pribadi. Masuk untuk melanjutkan.</p>
        </div>
        <Suspense>
          <LoginError searchParams={searchParams} />
        </Suspense>
        <GoogleSignInButton />
      </div>
    </main>
  );
}
