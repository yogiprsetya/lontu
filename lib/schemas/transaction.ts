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

export const MIN_TRANSACTION_DATE = "2000-01-01";

const amount = z
  .int("Nominal harus bilangan bulat rupiah")
  .min(1, "Nominal minimal Rp1")
  .max(1e12, "Maksimal 1 triliun");

// YYYY-MM-DD strings compare correctly as text. "Today" is read at parse time,
// so a long-lived schema never goes stale across midnight.
const date = z
  .iso.date("Tanggal tidak valid")
  .refine((d) => d >= MIN_TRANSACTION_DATE, "Tanggal minimal 1 Januari 2000")
  .refine((d) => d <= todayInJakarta(), "Tanggal tidak boleh melewati hari ini");

const description = z
  .string()
  .trim()
  .max(200, "Maksimal 200 karakter")
  .nullish()
  .transform((v) => v || null);

const base = { amount, date, accountId: z.uuid("Pilih akun"), description };

const categoryId = z.uuid("Pilih kategori");

// Nested issues flatten onto `fields.fee`, which the transfer form shows on its fee block.
const fee = z.strictObject({ amount, categoryId }, "Biaya admin tidak valid");

export const SIMPLE_TRANSACTION_TYPES = ["income", "expense", "saving"] as const;

export type SimpleTransactionType = (typeof SIMPLE_TRANSACTION_TYPES)[number];

export const simpleCreateSchema = z.strictObject({ type: z.enum(SIMPLE_TRANSACTION_TYPES), ...base, categoryId });

export const transferCreateSchema = z
  .strictObject({ type: z.literal("transfer"), ...base, toAccountId: z.uuid("Pilih akun tujuan"), fee: fee.optional() })
  .refine((v) => v.toAccountId !== v.accountId, { path: ["toAccountId"], error: "Akun tujuan harus berbeda" });

export const transactionCreateSchema = z.discriminatedUnion(
  "type",
  [simpleCreateSchema, transferCreateSchema],
  { error: (issue) => (issue.code === "invalid_union" ? "Jenis transaksi tidak valid" : undefined) },
);

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type SimpleCreateInput = z.infer<typeof simpleCreateSchema>;
export type TransferCreateInput = z.infer<typeof transferCreateSchema>;

export type TransactionTotals = { income: number; expense: number; saving: number };

export type TransactionPage = { items: Transaction[]; nextCursor: string | null };

export const DEFAULT_PAGE_SIZE = 30;

const filterShape = {
  type: z.enum(LIST_TRANSACTION_TYPES, "Jenis transaksi tidak valid").optional(),
  accountId: z.uuid("Akun tidak valid").optional(),
  categoryId: z.uuid("Kategori tidak valid").optional(),
  from: z.iso.date("Tanggal tidak valid").optional(),
  to: z.iso.date("Tanggal tidak valid").optional(),
};

const fromBeforeTo = (v: { from?: string; to?: string }) => !v.from || !v.to || v.from <= v.to;
const fromBeforeToIssue = { path: ["from"], error: "Tanggal awal harus sebelum tanggal akhir" };

/** Shared by list, totals and export. */
export const transactionFilterSchema = z.object(filterShape).refine(fromBeforeTo, fromBeforeToIssue);

export type TransactionFilters = z.infer<typeof transactionFilterSchema>;

export const transactionListQuerySchema = z
  .object({
    ...filterShape,
    cursor: z.string().min(1).optional(),
    limit: z.coerce
      .number("Batas tidak valid")
      .int("Batas tidak valid")
      .min(1, "Minimal 1")
      .max(100, "Maksimal 100")
      .default(DEFAULT_PAGE_SIZE),
  })
  .refine(fromBeforeTo, fromBeforeToIssue);
