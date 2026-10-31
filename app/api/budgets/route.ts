import { z } from "zod";
import { badRequest, budgetNameTaken, fieldError, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { budgetCreateSchema, budgetPeriodSchema, budgetSetSchema } from "@/lib/schemas/budget";
import { createBudget, setBudgets } from "@/lib/server/budgets";
import { legacyBudgetUsage } from "@/lib/server/queries/legacy-budget-usage";

const usageQuerySchema = z.object({ period: budgetPeriodSchema });

export const GET = withAuth(async (req, { userId }) => {
  const parsed = usageQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);

  return Response.json(await legacyBudgetUsage(userId, parsed.data.period));
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

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = budgetCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await createBudget(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("nameTaken" in result) return budgetNameTaken();
  return Response.json(result, { status: 201 });
});
