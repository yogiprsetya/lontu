import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { recurringRules } from "@/db/schema";
import type { RecurringOverview } from "@/lib/schemas/recurring";
import { toRule } from "@/lib/server/recurring";

/** `includeArchived` only widens `rules`; `due` is always active rules. */
export async function recurringOverview(
  userId: string,
  today: string,
  { includeArchived = false } = {},
): Promise<RecurringOverview> {
  const rows = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, userId), includeArchived ? undefined : isNull(recurringRules.archivedAt)))
    .orderBy(asc(recurringRules.nextDueDate), sql`lower(${recurringRules.name})`, asc(recurringRules.id));
  const rules = rows.map(toRule);
  return {
    rules,
    due: rules.filter((r) => !r.archivedAt && r.nextDueDate <= today),
    forecast: { status: "no_payday" },
  };
}
