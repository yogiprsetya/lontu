import { z } from "zod";
import { todayInJakarta } from "@/lib/date";
import { TRANSACTION_TYPES } from "@/lib/transaction-types";

export const LIST_TRANSACTION_TYPES = [...TRANSACTION_TYPES, "adjustment"] as const;

export type ListTransactionType = (typeof LIST_TRANSACTION_TYPES)[number];

export type Transaction = {
  id: string;
  type: ListTransactionType;
  /** Integer rupiah; signed only for adjustment. */
  amount: number;
  date: string;
  accountId: string;
  /** Non-null exactly when type is "transfer". */
  toAccountId: string | null;
  /** Null for transfer and adjustment. */
  categoryId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TransactionCreated = { transaction: Transaction; fee: Transaction | null };

const MIN_DATE = "2000-01-01";

const amount = z
  .int("Nominal harus bilangan bulat rupiah")
  .min(1, "Nominal minimal Rp1")
  .max(1e12, "Maksimal 1 triliun");

// YYYY-MM-DD strings compare correctly as text. "Today" is read at parse time,
// so a long-lived schema never goes stale across midnight.
const date = z
  .iso.date("Tanggal tidak valid")
  .refine((d) => d >= MIN_DATE, "Tanggal minimal 1 Januari 2000")
  .refine((d) => d <= todayInJakarta(), "Tanggal tidak boleh melewati hari ini");

const description = z
  .string()
  .trim()
  .max(200, "Maksimal 200 karakter")
  .nullish()
  .transform((v) => v || null);

const base = { amount, date, accountId: z.uuid("Pilih akun"), description };

export const transactionCreateSchema = z.discriminatedUnion(
  "type",
  [z.strictObject({ type: z.enum(["income", "expense", "saving"]), ...base, categoryId: z.uuid("Pilih kategori") })],
  { error: (issue) => (issue.code === "invalid_union" ? "Jenis transaksi tidak valid" : undefined) },
);

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
