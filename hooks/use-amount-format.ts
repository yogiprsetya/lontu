"use client";

import { displayAmount } from "@/lib/money";
import { useUIStore } from "@/stores/ui";

export type AmountFormat = (amount: number, format?: (amount: number) => string) => string;

/** Every amount on screen goes through this, so "Sembunyikan nominal" cannot be missed on one screen. */
export function useAmountFormat(): AmountFormat {
  const hidden = useUIStore((s) => s.hideAmounts);
  return (amount, format) => displayAmount(amount, hidden, format);
}

/** For what is not text: a sign colour, or a chart axis and tooltip that must not appear while amounts are hidden. */
export function useAmountsHidden() {
  return useUIStore((s) => s.hideAmounts);
}
