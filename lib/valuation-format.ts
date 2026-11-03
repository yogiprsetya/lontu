import { formatIDR } from "@/lib/money";
import { daysBetween } from "@/lib/period";
import { formatShortDate } from "@/lib/recurring-format";

/** SPEC-goals #16: a value older than this no longer describes the account. */
export const STALE_AFTER_DAYS = 35;

export function isStale(lastValuedAt: string | null, today: string) {
  return !lastValuedAt || daysBetween(lastValuedAt, today) > STALE_AFTER_DAYS;
}

/** Stale ages are spelled out, so an untended value is readable without colour. */
export function valuedLabel(lastValuedAt: string | null, today: string) {
  if (!lastValuedAt) return "belum pernah diperbarui";
  if (lastValuedAt === today) return "diperbarui hari ini";
  if (isStale(lastValuedAt, today))
    return `belum diperbarui ${daysBetween(lastValuedAt, today)} hari`;
  return `diperbarui ${formatShortDate(lastValuedAt, today)}`;
}

export function formatMarketGain(amount: number) {
  if (amount === 0) return formatIDR(0);
  return `${amount < 0 ? "−" : "+"}${formatIDR(Math.abs(amount))}`;
}

export function checkInMessage(recorded: number, name: string) {
  return recorded === 0 ? "Nilai sama, tidak ada yang dicatat" : `Nilai ${name} diperbarui`;
}
