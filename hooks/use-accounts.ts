"use client";

import useSWR, { mutate } from "swr";
import { sendJSON } from "@/lib/fetcher";
import type { Account, AccountCreateInput, AccountUpdateInput } from "@/lib/schemas/account";

type Options = { includeArchived?: boolean };

export function accountsKey({ includeArchived = false }: Options = {}) {
  return includeArchived ? "/api/accounts?include=archived" : "/api/accounts";
}

export function isAccountsKey(key: unknown) {
  return typeof key === "string" && key.startsWith("/api/accounts");
}

export function useAccounts(options: Options = {}) {
  return useSWR<Account[]>(accountsKey(options));
}

/** Call after any mutation that can change a balance, including transactions. */
export function revalidateAccounts() {
  return mutate(isAccountsKey);
}

export async function createAccount(input: AccountCreateInput) {
  const account = await sendJSON<Account>("/api/accounts", "POST", input);
  await revalidateAccounts();
  return account;
}

export async function updateAccount(id: string, input: AccountUpdateInput) {
  const account = await sendJSON<Account>(`/api/accounts/${id}`, "PATCH", input);
  await revalidateAccounts();
  return account;
}

export async function archiveAccount(id: string) {
  const account = await sendJSON<Account>(`/api/accounts/${id}`, "DELETE");
  await revalidateAccounts();
  return account;
}

export async function restoreAccount(id: string) {
  const account = await sendJSON<Account>(`/api/accounts/${id}/restore`, "POST");
  await revalidateAccounts();
  return account;
}
