import { transactionNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { restoreTransaction } from "@/lib/server/transactions";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const transaction = await restoreTransaction(userId, params.id);
  return transaction ? Response.json(transaction) : transactionNotFound();
});
