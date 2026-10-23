import { badRequest, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { budgetCopySchema } from "@/lib/schemas/budget";
import { copyBudgets } from "@/lib/server/budgets";

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = budgetCopySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  return Response.json(await copyBudgets(userId, parsed.data.to));
});
