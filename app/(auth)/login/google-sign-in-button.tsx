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
      className="h-11 w-full text-base"
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
