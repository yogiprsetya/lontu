export const TRANSACTION_TYPES = ["income", "expense", "saving", "transfer"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** What can be newly recorded. `saving` stays above for old rows: money set aside is now a transfer to an asset account. */
export const ADDABLE_TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;

export type AddableTransactionType = (typeof ADDABLE_TRANSACTION_TYPES)[number];

export function isAddableTransactionType(value: string): value is AddableTransactionType {
  return (ADDABLE_TRANSACTION_TYPES as readonly string[]).includes(value);
}

/** Money moved from a day-to-day account into an asset, which is what counts as saving. */
export function isDeposit(from?: { type: string }, to?: { type: string }) {
  return from?.type === "transaction" && to?.type === "asset";
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  saving: "Saving",
  transfer: "Transfer",
};

/** Written only by the server, signed, without a category, and never editable. */
export const SYSTEM_TRANSACTION_TYPES = ["adjustment", "revaluation"] as const;

export type SystemTransactionType = (typeof SYSTEM_TRANSACTION_TYPES)[number];

export function isSystemTransactionType(value: string): value is SystemTransactionType {
  return (SYSTEM_TRANSACTION_TYPES as readonly string[]).includes(value);
}

export const ADJUSTMENT_LABEL = "Penyesuaian";
export const REVALUATION_LABEL = "Revaluasi";

export const SYSTEM_TRANSACTION_TYPE_LABELS: Record<SystemTransactionType, string> = {
  adjustment: ADJUSTMENT_LABEL,
  revaluation: REVALUATION_LABEL,
};

export function transactionTypeLabel(type: TransactionType | SystemTransactionType) {
  return isSystemTransactionType(type)
    ? SYSTEM_TRANSACTION_TYPE_LABELS[type]
    : TRANSACTION_TYPE_LABELS[type];
}
