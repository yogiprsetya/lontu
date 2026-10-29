const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const groupFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

const decimalFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

const units = [
  { value: 1e12, label: "T" },
  { value: 1e9, label: "M" },
  { value: 1e6, label: "jt" },
  { value: 1e3, label: "rb" },
] as const;

/** Shown in place of any amount while "hide amounts" is on. */
export const HIDDEN_AMOUNT = "Rp•••••";

export function formatIDR(amount: number): string {
  // ICU versions differ on the space after "Rp" (NBSP vs none); strip it so server and client render the same.
  return idrFormatter.format(amount).replace(/\s/g, "");
}

/** `format(amount)`, or HIDDEN_AMOUNT while amounts are hidden. Components use `useAmountFormat` instead. */
export function displayAmount(amount: number, hidden: boolean, format: (amount: number) => string = formatIDR) {
  return hidden ? HIDDEN_AMOUNT : format(amount);
}

export function parseIDR(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

export function formatThousands(value: string | number): string {
  const parsed = typeof value === "number" ? value : parseIDR(value);
  return parsed === null ? "" : groupFormatter.format(parsed);
}

export function abbreviateIDR(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const unit = units.find((u) => abs >= u.value);
  if (!unit) return sign + groupFormatter.format(abs);
  // Truncate so 999.999 reads "999,9 rb" instead of rounding up to "1.000 rb".
  const scaled = Math.floor((abs / unit.value) * 10) / 10;
  return `${sign}${decimalFormatter.format(scaled)} ${unit.label}`;
}
