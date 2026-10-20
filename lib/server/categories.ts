import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

type Executor = Pick<typeof db, "execute">;

// One statement so concurrent logins cannot double-seed: the loser's rows hit the
// unique index and are skipped. "Has any category" includes archived ones, so a user
// who archived everything is not re-seeded.
export async function seedDefaultCategories(tx: Executor, userId: string) {
  const values = sql.join(
    DEFAULT_CATEGORIES.map((c) => sql`(${c.name}::text, ${c.kind}::text, ${c.spendingType}::text)`),
    sql`, `,
  );
  await tx.execute(sql`
    insert into categories (user_id, name, kind, spending_type)
    select ${userId}, v.name, v.kind, v.spending_type
    from (values ${values}) as v(name, kind, spending_type)
    where not exists (select 1 from categories where user_id = ${userId})
    on conflict do nothing
  `);
}
