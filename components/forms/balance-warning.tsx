"use client";

import { useAccounts } from "@/hooks/use-accounts";
import { formatIDR } from "@/lib/money";
import { balanceAfter } from "@/lib/transaction-balance";
import { useUIStore } from "@/stores/ui";

/** Non-blocking: the server accepts negative balances. */
export function useShortBalanceWarning(accountId: string, effect: number) {
  const { data } = useAccounts();
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const account = data?.find((a) => a.id === accountId);
  if (!account) return undefined;

  const { after, short } = balanceAfter({ balance: account.balance, subtype: account.subtype, effect });
  if (!short) return undefined;
  return (
    <span className="text-expense">
      {hideAmounts
        ? `Saldo ${account.name} tidak cukup.`
        : `Saldo ${account.name} ${formatIDR(account.balance)} tidak cukup, akan menjadi ${formatIDR(after)}.`}
    </span>
  );
}
