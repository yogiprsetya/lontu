import { badRequest, fieldError, invalidJson, ruleNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { todayInJakarta } from "@/lib/date";
import { recurringUpdateSchema } from "@/lib/schemas/recurring";
import { setRuleArchived, updateRule } from "@/lib/server/recurring";

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = recurringUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await updateRule(userId, params.id, parsed.data, todayInJakarta());
  if ("notFound" in result) return ruleNotFound();
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  return Response.json(result.rule);
});

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const rule = await setRuleArchived(userId, params.id, true);
  return rule ? Response.json(rule) : ruleNotFound();
});
