"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui";

export function HideAmountsButton() {
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const toggle = useUIStore((s) => s.toggleHideAmounts);

  return (
    <Button
      variant="ghost"
      className="size-11 shrink-0 rounded-xl bg-card shadow-soft hover:bg-sunny hover:text-sunny-foreground aria-pressed:bg-sunny aria-pressed:text-sunny-foreground"
      aria-label="Sembunyikan nominal"
      aria-pressed={hideAmounts}
      onClick={toggle}
    >
      {hideAmounts ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
    </Button>
  );
}
