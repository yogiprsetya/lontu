import { z } from "zod";
import type { TransactionType } from "@/lib/transaction-types";

export const CATEGORY_KINDS = ["income", "saving", "spending"] as const;
export const SPENDING_TYPES = ["needs", "wants"] as const;

export type CategoryKind = (typeof CATEGORY_KINDS)[number];
export type SpendingType = (typeof SPENDING_TYPES)[number];

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Non-null exactly when kind is "spending". */
  spendingType: SpendingType | null;
  archivedAt: string | null;
  createdAt: string;
};

export const CATEGORY_KIND_FOR: Record<Exclude<TransactionType, "transfer">, CategoryKind> = {
  income: "income",
  saving: "saving",
  expense: "spending",
};

const name = z.string().trim().min(1, "Nama wajib diisi").max(50, "Maksimal 50 karakter");

export const categoryCreateSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      name,
      kind: z.literal("spending"),
      spendingType: z.enum(SPENDING_TYPES, "Pilih needs atau wants"),
    }),
    z.object({
      name,
      kind: z.enum(["income", "saving"]),
      spendingType: z.null("Hanya kategori spending yang punya needs/wants").default(null),
    }),
  ],
  { error: (issue) => (issue.code === "invalid_union" ? "Jenis kategori tidak valid" : undefined) },
);

export const categoryRenameSchema = z.strictObject({ name }, "Hanya nama kategori yang bisa diubah");

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
