import { badRequest, fieldError, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { transactionCreateSchema } from "@/lib/schemas/transaction";
import { createTransaction } from "@/lib/server/transactions";

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await createTransaction(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  return Response.json(result, { status: 201 });
});
