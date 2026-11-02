import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { goalProjection } from "@/lib/goal-projection";
import { addDays, monthRange, shiftPeriod, yearMonthToPeriod } from "@/lib/period";
import type { Goal, GoalProgress } from "@/lib/schemas/goal";
import { STALE_AFTER_DAYS } from "@/lib/valuation-format";

type Options = { today: string; includeArchived?: boolean };

export function toGoal(row: typeof goals.$inferSelect): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    targetMonth:
      row.targetYear === null || row.targetMonth === null
        ? null
        : yearMonthToPeriod(row.targetYear, row.targetMonth),
    accountIds: row.accountIds,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** The goals' active accounts, owned by the user: an id in account_ids that is not theirs is never read. */
function goalAccounts(userId: string, includeArchived: boolean) {
  return sql`
    goal_accounts as (
      select g.id as goal_id, a.id as account_id, a.type, a.created_at
      from ${goals} g
      cross join lateral unnest(g.account_ids) as ids(account_id)
      join accounts a on a.id = ids.account_id and a.user_id = g.user_id and a.archived_at is null
      where g.user_id = ${userId} ${includeArchived ? sql`` : sql`and g.archived_at is null`}
    )`;
}

type Totals = {
  goal_id: string;
  current: string;
  market_gain: string;
  first_month: string | null;
  stale_ids: string[];
};

/** Per goal: balances and revaluations of its accounts, the oldest one's month, stale asset accounts. */
function totals(userId: string, includeArchived: boolean, staleBefore: string) {
  return db.execute<Totals>(sql`
    with ${goalAccounts(userId, includeArchived)},
    revaluations as (
      select account_id, sum(amount) as gain, max(date) as last
      from transactions
      where user_id = ${userId} and type = 'revaluation' and deleted_at is null
      group by account_id
    )
    select ga.goal_id,
      sum(b.balance)::bigint as current,
      coalesce(sum(r.gain), 0)::bigint as market_gain,
      to_char(min(ga.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM') as first_month,
      coalesce(
        array_agg(ga.account_id) filter (where ga.type = 'asset' and (r.last is null or r.last < ${staleBefore})),
        '{}'
      ) as stale_ids
    from goal_accounts ga
    join account_balances b on b.account_id = ga.account_id
    left join revaluations r on r.account_id = ga.account_id
    group by ga.goal_id
  `);
}

type Flow = { goal_id: string; month: string; flow: string };

/**
 * Net flow per goal per month (SPEC-goals #11). A transaction joins once per goal account it
 * touches, so a transfer between two accounts of one goal nets to 0 and one between goals moves.
 */
function flows(userId: string, includeArchived: boolean, from: string, to: string) {
  return db.execute<Flow>(sql`
    with ${goalAccounts(userId, includeArchived)}
    select ga.goal_id, to_char(t.date, 'YYYY-MM') as month, sum(case
        when t.type = 'income'                                     then t.amount
        when t.type in ('expense', 'saving')                       then -t.amount
        when t.type = 'transfer' and t.account_id = ga.account_id  then -t.amount
        when t.type = 'transfer' and t.to_account_id = ga.account_id then t.amount
      end)::bigint as flow
    from goal_accounts ga
    join transactions t
      on t.user_id = ${userId} and t.deleted_at is null
      and (t.account_id = ga.account_id or t.to_account_id = ga.account_id)
      and t.type not in ('adjustment', 'revaluation')
      and t.date between ${from} and ${to}
    group by ga.goal_id, month
  `);
}

/** `today` is a parameter so tests can pin it; the route passes `todayInJakarta()`. */
export async function goalProgress(
  userId: string,
  { today, includeArchived = false }: Options,
): Promise<GoalProgress[]> {
  // SPEC-goals #12: the three full calendar months before the current one, oldest first.
  const last = shiftPeriod(today.slice(0, 7), -1);
  const middle = shiftPeriod(last, -1);
  const window = [shiftPeriod(middle, -1), middle, last];
  const [rows, totalRows, flowRows] = await Promise.all([
    db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), includeArchived ? undefined : isNull(goals.archivedAt)))
      .orderBy(asc(goals.createdAt), asc(goals.id)),
    totals(userId, includeArchived, addDays(today, -STALE_AFTER_DAYS)),
    flows(userId, includeArchived, monthRange(window[0]).from, monthRange(last).to),
  ]);
  const totalsById = new Map(totalRows.map((r) => [r.goal_id, r]));

  return rows.map((row) => {
    const goal = toGoal(row);
    const t = totalsById.get(goal.id);
    const current = Number(t?.current ?? 0);
    const marketGain = Number(t?.market_gain ?? 0);
    // Months before the oldest active account existed are not counted (none without one).
    const counted = t?.first_month ? window.filter((m) => m >= t.first_month!) : [];
    const monthlyFlows = counted.map((month) =>
      Number(flowRows.find((f) => f.goal_id === goal.id && f.month === month)?.flow ?? 0),
    );
    const stale = new Set(t?.stale_ids ?? []);
    return {
      ...goal,
      current,
      marketGain,
      contributed: current - marketGain,
      staleAccountIds: goal.accountIds.filter((id) => stale.has(id)),
      projection: goalProjection({
        targetAmount: goal.targetAmount,
        targetMonth: goal.targetMonth,
        current,
        monthlyFlows,
        countedMonths: counted.length,
        today,
      }),
    };
  });
}
