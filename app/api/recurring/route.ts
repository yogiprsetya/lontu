import { badRequest, fieldError, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { todayInJakarta } from "@/lib/date";
import { recurringCreateSchema } from "@/lib/schemas/recurring";
import { recurringOverview } from "@/lib/server/queries/recurring-overview";
import { createRule } from "@/lib/server/recurring";

export const GET = withAuth(async (req, { userId }) => {
  const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "true";
  return Response.json(await recurringOverview(userId, todayInJakarta(), { includeArchived }));
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = recurringCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await createRule(userId, parsed.data, todayInJakarta());
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  return Response.json(result.rule, { status: 201 });
});
