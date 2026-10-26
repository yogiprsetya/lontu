"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      size="lg"
      className="h-12 w-full bg-sunny-foreground text-base font-bold text-sunny hover:bg-sunny-foreground/85 focus-visible:ring-sunny-foreground/40"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("google", { redirectTo: "/dashboard" });
      }}
    >
      {pending && <Loader2Icon className="animate-spin" aria-hidden />}
      Masuk dengan Google
    </Button>
  );
}
