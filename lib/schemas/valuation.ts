import { z } from "zod";
import { transactionDescriptionSchema } from "@/lib/schemas/transaction";

export type AssetValuation = {
  accountId: string;
  balance: number;
  /** Sum of the account's live revaluations. */
  marketGain: number;
  /** balance − marketGain: the opening balance, adjustments and every other transaction. */
  contributed: number;
  /** YYYY-MM-DD of the latest live revaluation. */
  lastValuedAt: string | null;
  /** The active goal that counts this account. */
  goalId: string | null;
};

export type ValuationResult = { recorded: number; assets: AssetValuation[] };

const item = z.strictObject({
  accountId: z.uuid("Akun tidak valid"),
  value: z
    .int("Nilai harus bilangan bulat rupiah")
    .min(0, "Nilai minimal Rp0")
    .max(1e12, "Maksimal 1 triliun"),
  /** Stored as the revaluation's description; dropped with an unchanged value (SPEC-goals #23). */
  note: transactionDescriptionSchema.optional(),
});

/** The client sends values only; the server works out each revaluation amount and dates it today. */
export const valuationSchema = z.strictObject({
  items: z
    .array(item, "Daftar nilai tidak valid")
    .min(1, "Isi minimal satu nilai")
    .max(50, "Maksimal 50 akun")
    .refine(
      (items) => new Set(items.map((i) => i.accountId)).size === items.length,
      "Akun tidak boleh dobel",
    ),
});

export type ValuationInput = z.infer<typeof valuationSchema>;
