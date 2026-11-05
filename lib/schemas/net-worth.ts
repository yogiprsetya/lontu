import { z } from "zod";
import { todayInJakarta } from "@/lib/date";
import { isPeriod, periodMode } from "@/lib/period";

export type NetWorth = {
  id: string;
  name: string;
  /** Integer rupiah, 1..1e12. */
  targetAmount: number;
  /** YYYY-MM. */
  targetMonth: string | null;
  /** In the order the client sent them. */
  accountIds: string[];
  archivedAt: string | null;
  createdAt: string;
};

export type NetWorthProjection = {
  /** max(targetAmount − current, 0). */
  remaining: number;
  reached: boolean;
  /** Net monthly flow into the net worth's accounts over the counted months, rounded down. */
  monthlyContribution: number | null;
  /** YYYY-MM; null when reached, without a rate, or with a rate ≤ 0. */
  etaMonth: string | null;
  /** Current month to target month, inclusive; null without a target month. */
  monthsLeft: number | null;
  /** null without a target month or once reached. */
  neededPerMonth: number | null;
  overdue: boolean;
  /** etaMonth ≤ targetMonth; null without either. */
  onTrack: boolean | null;
};

export type NetWorthProgress = NetWorth & {
  /** Sum of the balances of the net worth's active accounts. */
  current: number;
  /** Sum of the live revaluations of those accounts. */
  marketGain: number;
  /** current − marketGain. */
  contributed: number;
  /** Asset accounts never valued or last valued more than 35 days ago. */
  staleAccountIds: string[];
  projection: NetWorthProjection;
};

const name = z
  .string("Nama wajib diisi")
  .trim()
  .min(1, "Nama wajib diisi")
  .max(60, "Maksimal 60 karakter");

const targetAmount = z
  .int("Nominal harus bilangan bulat rupiah")
  .min(1, "Nominal minimal Rp1")
  .max(1e12, "Maksimal 1 triliun");

// YYYY-MM strings compare correctly as text. The current month is read at parse time,
// so a long-lived schema never goes stale across a month boundary. `kept` is a net worth's own
// stored month, which an edit may leave in place after it has passed.
const targetMonthSchema = (kept: string | null = null) =>
  z
    .string("Bulan target tidak valid")
    .refine((m) => isPeriod(m) && periodMode(m) === "month", {
      error: "Bulan target tidak valid",
      abort: true,
    })
    .refine(
      (m) => m === kept || m >= todayInJakarta().slice(0, 7),
      "Bulan target minimal bulan ini",
    )
    .nullable();

const targetMonth = targetMonthSchema();

const accountIds = z
  .array(z.uuid("Akun tidak valid"), "Pilih akun")
  .min(1, "Pilih minimal satu akun")
  .max(20, "Maksimal 20 akun")
  .refine((ids) => new Set(ids).size === ids.length, "Akun tidak boleh ganda");

export const netWorthCreateSchema = z.strictObject({
  name,
  targetAmount,
  targetMonth: targetMonth.default(null),
  accountIds,
});

export type NetWorthCreateInput = z.infer<typeof netWorthCreateSchema>;

/** The edit form's schema; the PATCH body only carries the fields that changed. */
export const netWorthEditSchema = (storedMonth: string | null) =>
  netWorthCreateSchema.extend({ targetMonth: targetMonthSchema(storedMonth).default(null) });

export const netWorthUpdateSchema = z
  .strictObject({ name, targetAmount, targetMonth, accountIds })
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Tidak ada perubahan");

export type NetWorthUpdateInput = z.infer<typeof netWorthUpdateSchema>;
