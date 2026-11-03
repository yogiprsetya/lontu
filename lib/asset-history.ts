import { formatTargetMonth } from "@/lib/goal-format";
import { abbreviateIDR } from "@/lib/money";
import type {
  AssetHistory,
  AssetHistoryMonth,
  AssetHistoryPoint,
  AssetHistoryValue,
} from "@/lib/schemas/asset-history";

/** Each month's change against the one before it; the first against `opening`. */
export function withChanges(
  opening: AssetHistoryValue,
  points: AssetHistoryPoint[],
): AssetHistoryMonth[] {
  return points.map((point, i) => {
    const prev = i === 0 ? opening : points[i - 1];
    return {
      ...point,
      contributionChange: point.contributed - prev.contributed,
      marketChange: point.marketGain - prev.marketGain,
    };
  });
}

export type AssetHistorySummary = {
  /** `YYYY-MM`, the first month shown. */
  since: string;
  change: number;
  contributed: number;
  market: number;
};

/** The last month against `opening`; null without months. */
export function assetHistorySummary({ opening, months }: AssetHistory): AssetHistorySummary | null {
  const last = months.at(-1);
  if (!last) return null;
  return {
    since: months[0].month,
    change: last.value - opening.value,
    contributed: last.contributed - opening.contributed,
    market: last.marketGain - opening.marketGain,
  };
}

/** The screen's amount formatter (`useAmountFormat`), so hidden amounts stay hidden. */
type Money = (amount: number, format: (amount: number) => string) => string;

/** "Rp12,4 jt", "−Rp300 rb". */
export function formatShortIDR(amount: number) {
  return `${amount < 0 ? "−" : ""}Rp${abbreviateIDR(Math.abs(amount))}`;
}

/** "+Rp12 jt", "−Rp300 rb", "Rp0": signs are text, so a rise or fall reads without colour. */
export function formatSignedShortIDR(amount: number) {
  return `${amount > 0 ? "+" : ""}${formatShortIDR(amount)}`;
}

/** "Naik Rp12,4 jt sejak Agu 2026: setoran +Rp12 jt, pasar +Rp400 rb." No percent (SPEC-asset-history #4). */
export function summarySentence(
  { since, change, contributed, market }: AssetHistorySummary,
  money: Money,
) {
  const head =
    change === 0
      ? `Tetap sejak ${formatTargetMonth(since)}`
      : `${change > 0 ? "Naik" : "Turun"} ${money(Math.abs(change), formatShortIDR)} sejak ${formatTargetMonth(since)}`;
  return `${head}: setoran ${money(contributed, formatSignedShortIDR)}, pasar ${money(market, formatSignedShortIDR)}.`;
}
