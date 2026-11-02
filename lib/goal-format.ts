import { archiveLabel } from "@/lib/archived";
import { abbreviateIDR, formatIDR } from "@/lib/money";
import { periodToYearMonth } from "@/lib/period";
import type { Account } from "@/lib/schemas/account";
import type { Goal, GoalProgress } from "@/lib/schemas/goal";

/** The screen's amount formatter (`useAmountFormat`), so hidden amounts stay hidden. */
type Money = (amount: number, format: (amount: number) => string) => string;

const plain: Money = (amount, format) => format(amount);

const short = (amount: number) => `Rp${abbreviateIDR(amount)}`;

const monthYear = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

/** "Des 2028". */
export function formatTargetMonth(month: string) {
  return monthYear.format(new Date(`${month}-01T00:00:00Z`));
}

function monthsBetween(from: string, to: string) {
  const a = periodToYearMonth(from);
  const b = periodToYearMonth(to);
  return (b.year - a.year) * 12 + b.month - a.month;
}

/** Current as a share of the target, floored; may pass 100. */
export function goalPercent(current: number, targetAmount: number) {
  return Math.max(0, Math.floor((current * 100) / targetAmount));
}

/** The card's projection sentences (SPEC-goals § UI), lateness spelled out rather than coloured. */
export function goalProjectionText(
  { targetMonth, projection: p }: Pick<GoalProgress, "targetMonth" | "projection">,
  money: Money = plain,
): string[] {
  if (p.reached) return ["Tercapai"];

  const rateLine =
    p.monthlyContribution === null
      ? "Perkiraan muncul setelah satu bulan penuh"
      : p.monthlyContribution <= 0
        ? "Belum ada setoran 3 bulan terakhir"
        : undefined;

  if (targetMonth === null) {
    return [
      rateLine ??
        `Dengan laju ${money(p.monthlyContribution!, short)}/bulan, tercapai sekitar ${formatTargetMonth(p.etaMonth!)}`,
    ];
  }
  if (p.overdue) return [`Bulan target sudah lewat · kurang ${money(p.remaining, formatIDR)}`];

  const need = `Butuh ${money(p.neededPerMonth!, short)}/bulan sampai ${formatTargetMonth(targetMonth)}`;
  if (rateLine) return [need, rateLine];
  if (p.onTrack) return [need, "Dengan laju sekarang: tepat waktu"];
  const late = monthsBetween(targetMonth, p.etaMonth!);
  return [
    need,
    `Dengan laju sekarang: ${formatTargetMonth(p.etaMonth!)} (terlambat ${late} bulan)`,
  ];
}

export type GoalAccountOption = {
  id: string;
  name: string;
  balance: number;
  /** The other active goal that already counts this account; shown, but not pickable. */
  takenBy: string | null;
};

/**
 * Accounts the goal form offers (SPEC-goals #10, #15): no credit cards, active ones, plus the
 * archived ones `self` already counts. `goals` may include archived goals; they hold nothing.
 */
export function goalAccountOptions(
  accounts: Account[],
  goals: Pick<Goal, "id" | "name" | "accountIds" | "archivedAt">[],
  self?: Pick<Goal, "id" | "accountIds">,
): GoalAccountOption[] {
  const owner = new Map<string, string>();
  for (const goal of goals)
    if (!goal.archivedAt && goal.id !== self?.id)
      for (const id of goal.accountIds) owner.set(id, goal.name);
  return accounts
    .filter(
      (a) => a.subtype !== "credit_card" && (!a.archivedAt || self?.accountIds.includes(a.id)),
    )
    .map((a) => ({
      id: a.id,
      name: archiveLabel(a),
      balance: a.balance,
      takenBy: owner.get(a.id) ?? null,
    }));
}
