"use client";

import { useAccounts } from "@/hooks/use-accounts";
import { useAmountsHidden } from "@/hooks/use-amount-format";
import { formatIDR } from "@/lib/money";
import { balanceAfter } from "@/lib/transaction-balance";

/** Non-blocking: the server accepts negative balances. `previous` is the stored version when editing. */
export function useShortBalanceWarning(accountId: string, effect: number, previous?: { accountId: string; effect: number }) {
  const { data } = useAccounts();
  const hidden = useAmountsHidden();
  const account = data?.find((a) => a.id === accountId);
  if (!account) return undefined;

  const { after, short } = balanceAfter({
    balance: account.balance,
    subtype: account.subtype,
    effect,
    // The stored version only sits in this account's balance if the account is unchanged.
    previousEffect: previous?.accountId === accountId ? previous.effect : undefined,
  });
  if (!short) return undefined;
  return (
    <span className="text-expense">
      {hidden
        ? `Saldo ${account.name} tidak cukup.`
        : `Saldo ${account.name} ${formatIDR(account.balance)} tidak cukup, akan menjadi ${formatIDR(after)}.`}
    </span>
  );
}
