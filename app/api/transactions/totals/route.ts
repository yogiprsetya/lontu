import { badRequest } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { transactionFilterSchema } from "@/lib/schemas/transaction";
import { transactionTotals } from "@/lib/server/queries/transaction-totals";

export const GET = withAuth(async (req, { userId }) => {
  const parsed = transactionFilterSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);

  return Response.json(await transactionTotals(userId, parsed.data));
});
