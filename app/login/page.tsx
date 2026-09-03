"use client";

import { redirect } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export default function LoginPage() {
  const { data: session } = useSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Lontu</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track expenses in three taps.
        </p>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
