import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { netWorths } from "@/db/schema";
import { netWorthProjection } from "@/lib/net-worth-projection";
import { addDays, addMonths, monthRange, yearMonthToPeriod } from "@/lib/period";
import type { NetWorth, NetWorthProgress } from "@/lib/schemas/net-worth";
import { STALE_AFTER_DAYS } from "@/lib/valuation-format";

type Options = { today: string; includeArchived?: boolean };

function toNetWorth(row: typeof netWorths.$inferSelect): NetWorth {
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

/** The net worths' active accounts, owned by the user: an id in account_ids that is not theirs is never read. */
function netWorthAccounts(userId: string, includeArchived: boolean) {
  return sql`
    net_worth_accounts as (
      select g.id as net_worth_id, a.id as account_id, a.type, a.created_at
      from ${netWorths} g
      cross join lateral unnest(g.account_ids) as ids(account_id)
      join accounts a on a.id = ids.account_id and a.user_id = g.user_id and a.archived_at is null
      where g.user_id = ${userId} ${includeArchived ? sql`` : sql`and g.archived_at is null`}
    )`;
}

type Totals = {
  net_worth_id: string;
  current: string;
  market_gain: string;
  first_month: string | null;
  stale_ids: string[];
};

/** Per net worth: balances and revaluations of its accounts, the oldest one's month, stale asset accounts. */
function totals(userId: string, includeArchived: boolean, staleBefore: string) {
  return db.execute<Totals>(sql`
    with ${netWorthAccounts(userId, includeArchived)},
    revaluations as (
      select account_id, sum(amount) as gain, max(date) as last
      from transactions
      where user_id = ${userId} and type = 'revaluation' and deleted_at is null
      group by account_id
    )
    select ga.net_worth_id,
      sum(b.balance)::bigint as current,
      coalesce(sum(r.gain), 0)::bigint as market_gain,
      to_char(min(ga.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM') as first_month,
      coalesce(
        array_agg(ga.account_id) filter (where ga.type = 'asset' and (r.last is null or r.last < ${staleBefore})),
        '{}'
      ) as stale_ids
    from net_worth_accounts ga
    join account_balances b on b.account_id = ga.account_id
    left join revaluations r on r.account_id = ga.account_id
    group by ga.net_worth_id
  `);
}

type Flow = { net_worth_id: string; month: string; flow: string };

/**
 * Net flow per net worth per month (SPEC-net-worth #11). A transaction joins once per net worth account it
 * touches, so a transfer between two accounts of one net worth nets to 0 and one between net worths moves.
 */
function flows(userId: string, includeArchived: boolean, from: string, to: string) {
  return db.execute<Flow>(sql`
    with ${netWorthAccounts(userId, includeArchived)}
    select ga.net_worth_id, to_char(t.date, 'YYYY-MM') as month, sum(case
        when t.type = 'income'                                     then t.amount
        when t.type in ('expense', 'saving')                       then -t.amount
        when t.type = 'transfer' and t.account_id = ga.account_id  then -t.amount
        when t.type = 'transfer' and t.to_account_id = ga.account_id then t.amount
      end)::bigint as flow
    from net_worth_accounts ga
    join transactions t
      on t.user_id = ${userId} and t.deleted_at is null
      and (t.account_id = ga.account_id or t.to_account_id = ga.account_id)
      and t.type not in ('adjustment', 'revaluation')
      and t.date between ${from} and ${to}
    group by ga.net_worth_id, month
  `);
}

/** `today` is a parameter so tests can pin it; the route passes `todayInJakarta()`. */
export async function netWorthProgress(
  userId: string,
  { today, includeArchived = false }: Options,
): Promise<NetWorthProgress[]> {
  // SPEC-net-worth #12: the three full calendar months before the current one, oldest first.
  const window = [3, 2, 1].map((back) => addMonths(today.slice(0, 7), -back));
  const [rows, totalRows, flowRows] = await Promise.all([
    db
      .select()
      .from(netWorths)
      .where(
        and(
          eq(netWorths.userId, userId),
          includeArchived ? undefined : isNull(netWorths.archivedAt),
        ),
      )
      .orderBy(asc(netWorths.createdAt), asc(netWorths.id)),
    totals(userId, includeArchived, addDays(today, -STALE_AFTER_DAYS)),
    flows(userId, includeArchived, monthRange(window[0]).from, monthRange(window[2]).to),
  ]);
  const totalsById = new Map(totalRows.map((r) => [r.net_worth_id, r]));

  return rows.map((row) => {
    const netWorth = toNetWorth(row);
    const t = totalsById.get(netWorth.id);
    const current = Number(t?.current ?? 0);
    const marketGain = Number(t?.market_gain ?? 0);
    // Months before the oldest active account existed are not counted (none without one).
    const counted = t?.first_month ? window.filter((m) => m >= t.first_month!) : [];
    const monthlyFlows = counted.map((month) =>
      Number(flowRows.find((f) => f.net_worth_id === netWorth.id && f.month === month)?.flow ?? 0),
    );
    const stale = new Set(t?.stale_ids ?? []);
    return {
      ...netWorth,
      current,
      marketGain,
      contributed: current - marketGain,
      staleAccountIds: netWorth.accountIds.filter((id) => stale.has(id)),
      projection: netWorthProjection({
        targetAmount: netWorth.targetAmount,
        targetMonth: netWorth.targetMonth,
        current,
        monthlyFlows,
        countedMonths: counted.length,
        today,
      }),
    };
  });
}
