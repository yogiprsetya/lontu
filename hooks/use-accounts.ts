"use client";

import useSWR from "swr";
import { invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { Account, AccountCreateInput, AccountUpdateInput } from "@/lib/schemas/account";

type Options = { includeArchived?: boolean };

export function accountsKey({ includeArchived = false }: Options = {}) {
  return includeArchived ? "/api/accounts?include=archived" : "/api/accounts";
}

export function useAccounts(options: Options = {}) {
  return useSWR<Account[]>(accountsKey(options));
}

export async function createAccount(input: AccountCreateInput) {
  const account = await sendJSON<Account>("/api/accounts", "POST", input);
  await invalidate("accounts");
  return account;
}

export async function updateAccount(id: string, input: AccountUpdateInput) {
  const account = await sendJSON<Account>(`/api/accounts/${id}`, "PATCH", input);
  await invalidate("accounts");
  return account;
}

export async function archiveAccount(id: string) {
  const account = await sendJSON<Account>(`/api/accounts/${id}`, "DELETE");
  await invalidate("accounts");
  return account;
}

export async function restoreAccount(id: string) {
  const account = await sendJSON<Account>(`/api/accounts/${id}/restore`, "POST");
  await invalidate("accounts");
  return account;
}
