import { z } from "zod";
import { badRequest, fieldError, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { budgetPeriodSchema, budgetSetSchema } from "@/lib/schemas/budget";
import { setBudgets } from "@/lib/server/budgets";
import { budgetUsage } from "@/lib/server/queries/budget-usage";

const usageQuerySchema = z.object({ period: budgetPeriodSchema });

export const GET = withAuth(async (req, { userId }) => {
  const parsed = usageQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);

  return Response.json(await budgetUsage(userId, parsed.data.period));
});

export const PUT = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = budgetSetSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await setBudgets(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  return Response.json(result);
});
