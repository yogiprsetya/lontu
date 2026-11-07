import { archiveLabel } from "@/lib/archived";
import { abbreviateIDR, formatIDR } from "@/lib/money";
import { monthsBetween } from "@/lib/period";
import type { Account } from "@/lib/schemas/account";
import type {
  NetWorth,
  NetWorthCreateInput,
  NetWorthProgress,
  NetWorthUpdateInput,
} from "@/lib/schemas/net-worth";

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

/** Current as a share of the target, floored; may pass 100. */
export function netWorthPercent(current: number, targetAmount: number) {
  return Math.max(0, Math.floor((current * 100) / targetAmount));
}

/** The card's projection sentences (SPEC-net-worth § UI), lateness spelled out rather than coloured. */
export function netWorthProjectionText(
  { targetMonth, projection: p }: Pick<NetWorthProgress, "targetMonth" | "projection">,
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

export type NetWorthAccountOption = {
  id: string;
  name: string;
  balance: number;
  /** The other active net worth that already counts this account; shown, but not pickable. */
  takenBy: string | null;
};

/**
 * Accounts the net worth form offers (SPEC-net-worth #10, #15): no credit cards, active ones, plus the
 * archived ones `self` already counts. `netWorths` may include archived net worths; they hold nothing.
 */
export function netWorthAccountOptions(
  accounts: Account[],
  netWorths: Pick<NetWorth, "id" | "name" | "accountIds" | "archivedAt">[],
  self?: Pick<NetWorth, "id" | "accountIds">,
): NetWorthAccountOption[] {
  const owner = new Map<string, string>();
  for (const netWorth of netWorths)
    if (!netWorth.archivedAt && netWorth.id !== self?.id)
      for (const id of netWorth.accountIds) owner.set(id, netWorth.name);
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

type Editable = Pick<NetWorth, "name" | "targetAmount" | "targetMonth" | "accountIds">;

/** The PATCH body for an edit: only changed fields, so untouched accounts are not rechecked. */
export function netWorthChanges(
  netWorth: Editable,
  input: NetWorthCreateInput,
): NetWorthUpdateInput {
  const changes: NetWorthUpdateInput = {};
  if (input.name !== netWorth.name) changes.name = input.name;
  if (input.targetAmount !== netWorth.targetAmount) changes.targetAmount = input.targetAmount;
  if (input.targetMonth !== netWorth.targetMonth) changes.targetMonth = input.targetMonth;
  if (input.accountIds.join() !== netWorth.accountIds.join()) changes.accountIds = input.accountIds;
  return changes;
}
