import { z } from "zod";
import { accountNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { setAccountArchived } from "@/lib/server/accounts";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  if (!z.uuid().safeParse(params.id).success) return accountNotFound();
  const account = await setAccountArchived(userId, params.id, false);
  return account ? Response.json(account) : accountNotFound();
});
