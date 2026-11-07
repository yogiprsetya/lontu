import { addMonths, monthsBetween } from "@/lib/period";
import type { NetWorthProjection } from "@/lib/schemas/net-worth";

type Input = {
  targetAmount: number;
  targetMonth: string | null;
  current: number;
  /** Net flow per counted month in the rate window. */
  monthlyFlows: number[];
  /** 0..3 full months before the current one (SPEC-net-worth #12). */
  countedMonths: number;
  /** YYYY-MM-DD in Asia/Jakarta. */
  today: string;
};

/** Contributions only: market gains are never projected forward (SPEC-net-worth #13). */
export function netWorthProjection({
  targetAmount,
  targetMonth,
  current,
  monthlyFlows,
  countedMonths,
  today,
}: Input): NetWorthProjection {
  const currentMonth = today.slice(0, 7);
  const remaining = Math.max(targetAmount - current, 0);
  const reached = remaining === 0;
  const monthlyContribution =
    countedMonths === 0
      ? null
      : Math.floor(monthlyFlows.reduce((sum, flow) => sum + flow, 0) / countedMonths);
  const etaMonth =
    reached || monthlyContribution === null || monthlyContribution <= 0
      ? null
      : addMonths(currentMonth, Math.ceil(remaining / monthlyContribution) - 1);

  if (targetMonth === null) {
    return {
      remaining,
      reached,
      monthlyContribution,
      etaMonth,
      monthsLeft: null,
      neededPerMonth: null,
      overdue: false,
      onTrack: null,
    };
  }

  const monthsLeft = Math.max(monthsBetween(currentMonth, targetMonth) + 1, 0);
  const overdue = !reached && monthsLeft === 0;
  return {
    remaining,
    reached,
    monthlyContribution,
    etaMonth,
    monthsLeft,
    neededPerMonth: reached ? null : overdue ? remaining : Math.ceil(remaining / monthsLeft),
    overdue,
    onTrack: etaMonth === null ? null : etaMonth <= targetMonth,
  };
}
