import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  pgView,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const userId = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
const money = (name: string) => bigint(name, { mode: "number" });

export const users = pgTable.withRLS("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  image: text("image"),
  phone: text("phone"),
  location: text("location"),
  currency: text("currency").notNull().default("IDR"),
  createdAt: createdAt(),
});

export const accounts = pgTable.withRLS(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    subtype: text("subtype"),
    initialBalance: money("initial_balance").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("accounts_type_check", sql`${t.type} in ('transaction', 'asset')`),
    uniqueIndex("accounts_user_name_unique").on(t.userId, sql`lower(${t.name})`),
  ],
);

export const categories = pgTable.withRLS(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    spendingType: text("spending_type"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("categories_kind_check", sql`${t.kind} in ('income', 'saving', 'spending')`),
    check(
      "categories_spending_type_check",
      sql`(${t.spendingType} is null or ${t.spendingType} in ('needs', 'wants')) and (${t.kind} = 'spending') = (${t.spendingType} is not null)`,
    ),
    uniqueIndex("categories_user_kind_name_unique").on(t.userId, t.kind, sql`lower(${t.name})`),
  ],
);

export const transactions = pgTable.withRLS(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    type: text("type").notNull(),
    amount: money("amount").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    toAccountId: uuid("to_account_id").references(() => accounts.id),
    categoryId: uuid("category_id").references(() => categories.id),
    description: text("description"),
    receiptUrl: text("receipt_url"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "transactions_type_check",
      sql`${t.type} in ('income', 'expense', 'saving', 'transfer', 'adjustment')`,
    ),
    check(
      "transactions_amount_check",
      sql`case when ${t.type} = 'adjustment' then ${t.amount} <> 0 else ${t.amount} > 0 end`,
    ),
    check("transactions_transfer_target_check", sql`(${t.type} = 'transfer') = (${t.toAccountId} is not null)`),
    check(
      "transactions_category_check",
      sql`(${t.type} in ('transfer', 'adjustment')) = (${t.categoryId} is null)`,
    ),
    check("transactions_distinct_accounts_check", sql`${t.toAccountId} <> ${t.accountId}`),
    index("transactions_user_date_idx").on(t.userId, t.date.desc(), t.id.desc()),
    index("transactions_user_account_idx").on(t.userId, t.accountId),
    index("transactions_user_to_account_idx").on(t.userId, t.toAccountId),
    index("transactions_user_category_date_idx").on(t.userId, t.categoryId, t.date),
  ],
);

export const budgets = pgTable.withRLS(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    amount: money("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("budgets_month_check", sql`${t.month} between 1 and 12`),
    check("budgets_amount_check", sql`${t.amount} >= 0`),
    uniqueIndex("budgets_user_category_period_unique").on(t.userId, t.categoryId, t.year, t.month),
  ],
);

export const accountBalances = pgView("account_balances", {
  accountId: uuid("account_id").notNull(),
  userId: text("user_id").notNull(),
  balance: money("balance").notNull(),
})
  .with({ securityInvoker: true })
  .as(sql`
    select a.id as account_id, a.user_id,
      a.initial_balance + coalesce(sum(case
        when t.type in ('income', 'adjustment')             then t.amount
        when t.type in ('expense', 'saving')                then -t.amount
        when t.type = 'transfer' and t.account_id = a.id    then -t.amount
        when t.type = 'transfer' and t.to_account_id = a.id then t.amount
      end), 0)::bigint as balance
    from accounts a
    left join transactions t
      on t.deleted_at is null and (t.account_id = a.id or t.to_account_id = a.id)
    group by a.id
  `);
