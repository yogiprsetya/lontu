"use client";

import { SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallCard() {
  const { state, install, dismiss } = useInstallPrompt();
  if (state === "hidden") return null;

  return (
    <section aria-labelledby="install-heading" className="flex flex-col gap-3 surface px-5 py-5">
      <div className="flex items-start gap-3">
        <SmartphoneIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1">
          <h2 id="install-heading" className="font-heading text-lg font-bold">
            Pasang Lontu di layar utama
          </h2>
          <p className="text-sm text-muted-foreground">
            {state === "prompt"
              ? "Buka lebih cepat dan tetap bisa dipakai tanpa sinyal."
              : "Ketuk Bagikan lalu Tambahkan ke Layar Utama."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {state === "prompt" && (
          <Button className="h-11 text-base" onClick={() => void install()}>
            Pasang
          </Button>
        )}
        <Button variant="ghost" className="h-11 text-base" onClick={dismiss}>
          Nanti
        </Button>
      </div>
    </section>
  );
}
