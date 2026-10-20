import { z } from "zod";

export const ACCOUNT_TYPES = ["transaction", "asset"] as const;
export const ACCOUNT_SUBTYPES = ["debit", "ewallet", "credit_card", "investment", "crypto", "other"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type AccountSubtype = (typeof ACCOUNT_SUBTYPES)[number];

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype | null;
  /** Effective starting balance: initial_balance plus all live adjustments. */
  initialBalance: number;
  balance: number;
  archivedAt: string | null;
  createdAt: string;
};

const name = z.string().trim().min(1, "Nama wajib diisi").max(50, "Maksimal 50 karakter");
const type = z.enum(ACCOUNT_TYPES, "Jenis akun tidak valid");
const subtype = z.enum(ACCOUNT_SUBTYPES, "Subjenis akun tidak valid").nullable();
const initialBalance = z
  .int("Saldo harus bilangan bulat rupiah")
  .min(-1e12, "Minimal -1 triliun")
  .max(1e12, "Maksimal 1 triliun");

export const accountCreateSchema = z.object({
  name,
  type,
  subtype: subtype.default(null),
  initialBalance: initialBalance.default(0),
});

export const accountUpdateSchema = z
  .object({ name, type, subtype, initialBalance })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan");

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
