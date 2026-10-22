import { badRequest, fieldError, invalidJson, transactionNotEditable, transactionNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { getTransaction, updateTransaction } from "@/lib/server/transactions";

export const GET = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const transaction = await getTransaction(userId, params.id);
  return transaction ? Response.json(transaction) : transactionNotFound();
});

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const result = await updateTransaction(userId, params.id, body);
  if ("notFound" in result) return transactionNotFound();
  if ("notEditable" in result) return transactionNotEditable();
  if ("validation" in result) return badRequest(result.validation);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  return Response.json(result.transaction);
});
