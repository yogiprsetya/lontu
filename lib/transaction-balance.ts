import type { AccountSubtype } from "@/lib/schemas/account";

type BalanceAfterInput = {
  balance: number;
  subtype: AccountSubtype | null;
  /** Signed change this transaction makes to the account; negative for money going out. */
  effect: number;
  /** Effect of the stored version when editing, already included in `balance`. */
  previousEffect?: number;
};

/** Balance after saving. `short` drives the non-blocking warning; credit cards are expected to go negative. */
export function balanceAfter({ balance, subtype, effect, previousEffect = 0 }: BalanceAfterInput) {
  const after = balance - previousEffect + effect;
  return { after, short: effect < 0 && after < 0 && subtype !== "credit_card" };
}

/** Signed change a simple transaction makes to its account. */
export function signedEffect(type: "income" | "expense" | "saving", amount: number) {
  return type === "income" ? amount : -amount;
}
