import { accountNameTaken, badRequest, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { accountCreateSchema } from "@/lib/schemas/account";
import { createAccount, listAccounts } from "@/lib/server/accounts";

export const GET = withAuth(async (req, { userId }) => {
  const includeArchived = new URL(req.url).searchParams.get("include") === "archived";
  return Response.json(await listAccounts(userId, { includeArchived }));
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = accountCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const account = await createAccount(userId, parsed.data);
  if (!account) return accountNameTaken();
  return Response.json(account, { status: 201 });
});
