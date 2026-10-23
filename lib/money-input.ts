import { formatThousands, parseIDR } from "@/lib/money";

/** Digits typed by the user plus the ± toggle → integer rupiah. Empty → 0. */
export function moneyFromInput(text: string, negative: boolean): number {
  const value = parseIDR(text) ?? 0;
  return negative && value !== 0 ? -value : value;
}

/** Integer rupiah → field text. The sign lives on the ± toggle, so only the magnitude is shown. */
export function moneyToInput(value: number): string {
  return value === 0 ? "" : formatThousands(Math.abs(value));
}
