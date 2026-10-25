import { badRequest, fieldError, invalidCursor, invalidJson, transactionIdTaken } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { transactionCreateSchema, transactionListQuerySchema } from "@/lib/schemas/transaction";
import { createTransaction, listTransactions } from "@/lib/server/transactions";

export const GET = withAuth(async (req, { userId }) => {
  const parsed = transactionListQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);

  const result = await listTransactions(userId, parsed.data);
  if ("invalidCursor" in result) return invalidCursor();
  return Response.json(result);
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await createTransaction(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("idTaken" in result) return transactionIdTaken();
  return Response.json(result.created, { status: result.replayed ? 200 : 201 });
});
