import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { withChanges } from "@/lib/asset-history";
import type {
  AssetHistory,
  AssetHistoryPoint,
  AssetHistoryRange,
} from "@/lib/schemas/asset-history";

type Options = { range: AssetHistoryRange; accountId: string | null; today: string };

type Row = { month: string; contributed: string; market_gain: string };

/**
 * End-of-month contributed and market gain from each active asset account's first month to
 * `today`'s, with the `account_balances` formula. A transaction joins once per asset account it
 * touches, so a transfer between two assets nets to 0 combined (SPEC-asset-history #9).
 */
function series(userId: string, accountId: string | null, today: string) {
  return db.execute<Row>(sql`
    with assets as (
      select a.id, a.initial_balance, least(
        to_char(a.created_at at time zone 'Asia/Jakarta', 'YYYY-MM'),
        (select to_char(min(t.date), 'YYYY-MM') from ${transactions} t
          where t.user_id = ${userId} and t.deleted_at is null
          and (t.account_id = a.id or t.to_account_id = a.id))
      ) as first_month
      from ${accounts} a
      where a.user_id = ${userId} and a.type = 'asset' and a.archived_at is null
      ${accountId === null ? sql`` : sql`and a.id = ${accountId}`}
    ),
    deltas as (
      select to_char(t.date, 'YYYY-MM') as month,
        case
          when t.type in ('income', 'adjustment')                then t.amount
          when t.type in ('expense', 'saving')                   then -t.amount
          when t.type = 'transfer' and t.account_id = a.id       then -t.amount
          when t.type = 'transfer' and t.to_account_id = a.id    then t.amount
          else 0
        end as contributed,
        case when t.type = 'revaluation' then t.amount else 0 end as market_gain
      from assets a
      join ${transactions} t
        on t.user_id = ${userId} and t.deleted_at is null
        and (t.account_id = a.id or t.to_account_id = a.id)
      union all
      -- initial_balance is the balance before the first transaction (SPEC-asset-history #7).
      select first_month, initial_balance, 0 from assets
    )
    select to_char(m.start, 'YYYY-MM') as month,
      sum(coalesce(sum(d.contributed), 0)) over (order by m.start)::bigint as contributed,
      sum(coalesce(sum(d.market_gain), 0)) over (order by m.start)::bigint as market_gain
    from generate_series(
      ((select min(first_month) from assets) || '-01')::timestamp,
      ${`${today.slice(0, 7)}-01`}::timestamp,
      interval '1 month'
    ) as m(start)
    left join deltas d on d.month = to_char(m.start, 'YYYY-MM')
    group by m.start
    order by m.start
  `);
}

/**
 * `today` is a parameter so tests can pin it; the route passes `todayInJakarta()`.
 * null = `accountId` is not one of the user's active asset accounts.
 */
export async function assetHistory(
  userId: string,
  { range, accountId, today }: Options,
): Promise<AssetHistory | null> {
  const rows = await series(userId, accountId, today);
  // An active asset account always has a first month, so an empty series means none matched.
  if (accountId !== null && rows.length === 0) return null;

  const points: AssetHistoryPoint[] = rows.map((r) => {
    const contributed = Number(r.contributed);
    const marketGain = Number(r.market_gain);
    return { month: r.month, value: contributed + marketGain, contributed, marketGain };
  });
  const start = range === "all" ? 0 : Math.max(0, points.length - Number(range));
  const before = points[start - 1];
  const opening = before
    ? { value: before.value, contributed: before.contributed, marketGain: before.marketGain }
    : { value: 0, contributed: 0, marketGain: 0 };
  return { range, accountId, opening, months: withChanges(opening, points.slice(start)) };
}
