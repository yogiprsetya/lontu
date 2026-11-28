import { z } from "zod";
import { accountNotFound, badRequest, fieldError, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { accountReconcileSchema } from "@/lib/schemas/account";
import { reconcileAccountBalance } from "@/lib/server/accounts";

export const POST = withAuth<{ id: string }>(async (req, { userId, params }) => {
  if (!z.uuid().safeParse(params.id).success) return accountNotFound();

  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = accountReconcileSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const account = await reconcileAccountBalance(
    userId,
    params.id,
    parsed.data.balance,
    parsed.data.description,
  );
  if (account === undefined) return accountNotFound();
  if (account === null)
    return fieldError("account", "Koreksi saldo hanya tersedia untuk akun transaksi");
  return Response.json(account);
});
