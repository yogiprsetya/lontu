import { z } from "zod";
import {
  simpleCreateSchema,
  type SimpleTransactionType,
  type Transaction,
} from "@/lib/schemas/transaction";

// `saving` keeps old rules working; new ones to set money aside are `transfer`.
export const RECURRING_TYPES = ["income", "expense", "saving", "transfer"] as const;

export type RecurringType = (typeof RECURRING_TYPES)[number];

type RuleBase = {
  id: string;
  name: string;
  /** Integer rupiah, 1..1e12. */
  amount: number;
  accountId: string;
  /** 1..31; shorter months use their last day. */
  dayOfMonth: number;
  nextDueDate: string;
  isPayday: boolean;
  archivedAt: string | null;
  createdAt: string;
};

export type SimpleRule = RuleBase & {
  type: SimpleTransactionType;
  categoryId: string;
  toAccountId: null;
};

/** Sets money aside: always from a transaction account into an asset account. */
export type TransferRule = RuleBase & { type: "transfer"; categoryId: null; toAccountId: string };

export type RecurringRule = SimpleRule | TransferRule;

export type ForecastItem = { ruleId: string; dueDate: string; amount: number };

export type PaydayForecast =
  | { status: "no_payday" }
  | { status: "payday_due"; ruleId: string; dueDate: string }
  | {
      status: "ok";
      payday: string;
      /** Days from today to payday, at least 1. */
      daysLeft: number;
      /** May be negative. */
      spendable: number;
      committed: number;
      /** spendable − committed; may be negative. */
      free: number;
      items: ForecastItem[];
    };

export type RecurringOverview = {
  rules: RecurringRule[];
  /** Active rules with nextDueDate on or before today. */
  due: RecurringRule[];
  forecast: PaydayForecast;
};

export type AdvanceResult = { rule: RecurringRule; transaction: Transaction | null };

const name = z.string().trim().min(1, "Nama wajib diisi").max(60, "Maksimal 60 karakter");
const amount = z
  .int("Nominal harus bilangan bulat rupiah")
  .min(1, "Nominal minimal Rp1")
  .max(1e12, "Maksimal 1 triliun");
const dayOfMonth = z
  .int("Pilih tanggal 1–31")
  .min(1, "Pilih tanggal 1–31")
  .max(31, "Pilih tanggal 1–31");

const categoryId = z.uuid("Pilih kategori").optional();
const toAccountId = z.uuid("Pilih akun aset").optional();

const editable = {
  name,
  amount,
  accountId: z.uuid("Pilih akun"),
  categoryId,
  toAccountId,
  dayOfMonth,
  isPayday: z.boolean("Tidak valid"),
};

const paydayIssue = { path: ["isPayday"], error: "Hanya aturan income yang bisa jadi gajian" };

export const recurringCreateSchema = z
  .strictObject({
    type: z.enum(RECURRING_TYPES, "Jenis aturan tidak valid"),
    ...editable,
    isPayday: editable.isPayday.default(false),
  })
  .refine((v) => !v.isPayday || v.type === "income", paydayIssue)
  .refine((v) => (v.type === "transfer" ? !v.categoryId : !!v.categoryId), {
    path: ["categoryId"],
    error: "Pilih kategori",
  })
  .refine((v) => (v.type === "transfer" ? !!v.toAccountId : !v.toAccountId), {
    path: ["toAccountId"],
    error: "Pilih akun aset",
  })
  .refine((v) => v.toAccountId !== v.accountId, {
    path: ["toAccountId"],
    error: "Akun tujuan harus berbeda",
  });

/** `type` is never editable; whether `isPayday` fits the stored type is checked on the server. */
export const recurringUpdateSchema = z
  .strictObject(editable)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { error: "Tidak ada yang diubah" });

const occurrenceDate = z.iso.date("Tanggal kejadian tidak valid");

const { date, description } = simpleCreateSchema.shape;

// Flat post fields so `fields` maps straight onto RecordOccurrenceForm via applyServerErrors.
export const recurringAdvanceSchema = z.discriminatedUnion(
  "action",
  [
    z.strictObject({ action: z.literal("skip"), occurrenceDate }),
    z.strictObject({
      action: z.literal("post"),
      occurrenceDate,
      id: z.uuid("Id transaksi tidak valid"),
      amount,
      date,
      accountId: z.uuid("Pilih akun"),
      categoryId,
      toAccountId,
      description,
    }),
  ],
  { error: (issue) => (issue.code === "invalid_union" ? "Aksi tidak valid" : undefined) },
);

export type RecurringCreateInput = z.infer<typeof recurringCreateSchema>;
export type RecurringUpdateInput = z.infer<typeof recurringUpdateSchema>;
export type RecurringAdvanceInput = z.infer<typeof recurringAdvanceSchema>;
