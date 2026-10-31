import "server-only";
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import type {
  Category,
  CategoryCreateInput,
  CategoryKind,
  SpendingType,
} from "@/lib/schemas/category";

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

async function selectCategories(where: SQL | undefined): Promise<Category[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      spendingType: categories.spendingType,
      archivedAt: categories.archivedAt,
      createdAt: categories.createdAt,
    })
    .from(categories)
    .where(where)
    .orderBy(
      sql`case ${categories.kind} when 'income' then 0 when 'saving' then 1 else 2 end`,
      sql`case ${categories.spendingType} when 'needs' then 0 when 'wants' then 1 else 2 end`,
      sql`lower(${categories.name})`,
    );
  return rows.map((r) => ({
    ...r,
    kind: r.kind as CategoryKind,
    spendingType: r.spendingType as SpendingType | null,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export function listCategories(userId: string, { includeArchived = false } = {}) {
  return selectCategories(
    and(eq(categories.userId, userId), includeArchived ? undefined : isNull(categories.archivedAt)),
  );
}

export async function getCategory(userId: string, id: string): Promise<Category | undefined> {
  const [category] = await selectCategories(
    and(eq(categories.userId, userId), eq(categories.id, id)),
  );
  return category;
}

/** Returns undefined when the name is already taken within the kind (archived included). */
export async function createCategory(userId: string, input: CategoryCreateInput) {
  const [row] = await db
    .insert(categories)
    .values({ userId, ...input })
    .onConflictDoNothing()
    .returning({ id: categories.id });
  return row && getCategory(userId, row.id);
}

/** Returns undefined when the category is not the user's. A name clash throws a unique violation. */
export async function renameCategory(userId: string, id: string, name: string) {
  const [row] = await db
    .update(categories)
    .set({ name })
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .returning({ id: categories.id });
  return row && getCategory(userId, row.id);
}

export async function setCategoryArchived(userId: string, id: string, archived: boolean) {
  const [row] = await db
    .update(categories)
    // coalesce keeps the original timestamp when archiving twice.
    .set({ archivedAt: archived ? sql`coalesce(${categories.archivedAt}, now())` : null })
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .returning({ id: categories.id });
  return row && getCategory(userId, row.id);
}
