import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountBalances, accounts, recurringRules } from "@/db/schema";
import { paydayForecast } from "@/lib/payday-forecast";
import type { RecurringOverview } from "@/lib/schemas/recurring";
import { toRule } from "@/lib/server/recurring";

/** Money free to spend (spec decision #4): active transaction accounts except credit cards; null subtype counts. */
async function spendableBalance(userId: string) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${accountBalances.balance}), 0)::bigint`.mapWith(Number) })
    .from(accountBalances)
    .innerJoin(accounts, eq(accounts.id, accountBalances.accountId))
    .where(
      and(
        eq(accounts.userId, userId),
        isNull(accounts.archivedAt),
        eq(accounts.type, "transaction"),
        sql`${accounts.subtype} is distinct from 'credit_card'`,
      ),
    );
  return row.total;
}

/** `includeArchived` only widens `rules`; `due` and `forecast` always use active rules. */
export async function recurringOverview(
  userId: string,
  today: string,
  { includeArchived = false } = {},
): Promise<RecurringOverview> {
  const [rows, spendable] = await Promise.all([
    db
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, userId), includeArchived ? undefined : isNull(recurringRules.archivedAt)))
      .orderBy(asc(recurringRules.nextDueDate), sql`lower(${recurringRules.name})`, asc(recurringRules.id)),
    spendableBalance(userId),
  ]);
  const rules = rows.map(toRule);
  return {
    rules,
    due: rules.filter((r) => !r.archivedAt && r.nextDueDate <= today),
    forecast: paydayForecast({ rules, spendable, today }),
  };
}
