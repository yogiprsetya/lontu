import { z } from "zod";
import { badRequest } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { budgetPeriodSchema } from "@/lib/schemas/budget";
import { budgetUsage } from "@/lib/server/queries/budget-usage";

const usageQuerySchema = z.object({ period: budgetPeriodSchema });

export const GET = withAuth(async (req, { userId }) => {
  const parsed = usageQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);

  return Response.json(await budgetUsage(userId, parsed.data.period));
});
