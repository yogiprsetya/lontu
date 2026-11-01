import { badRequest } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { budgetUsageQuerySchema } from "@/lib/schemas/budget-usage";
import { budgetUsage } from "@/lib/server/queries/budget-usage";

export const GET = withAuth(async (req, { userId }) => {
  const parsed = budgetUsageQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) return badRequest(parsed.error);

  return Response.json(await budgetUsage(userId, parsed.data.period));
});
