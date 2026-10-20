import { z } from "zod";
import { accountNameTaken, accountNotFound, badRequest, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { accountUpdateSchema } from "@/lib/schemas/account";
import { setAccountArchived, updateAccount } from "@/lib/server/accounts";
import { isUniqueViolation } from "@/lib/server/pg-errors";

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  if (!z.uuid().safeParse(params.id).success) return accountNotFound();

  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const account = await updateAccount(userId, params.id, parsed.data);
    return account ? Response.json(account) : accountNotFound();
  } catch (err) {
    if (isUniqueViolation(err, "accounts_user_name_unique")) return accountNameTaken();
    throw err;
  }
});

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  if (!z.uuid().safeParse(params.id).success) return accountNotFound();
  const account = await setAccountArchived(userId, params.id, true);
  return account ? Response.json(account) : accountNotFound();
});
