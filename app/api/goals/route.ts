import { badRequest, fieldError, goalNameTaken, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { todayInJakarta } from "@/lib/date";
import { goalCreateSchema } from "@/lib/schemas/goal";
import { createGoal } from "@/lib/server/goals";
import { goalProgress } from "@/lib/server/queries/goal-progress";

export const GET = withAuth(async (req, { userId }) => {
  const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "true";
  return Response.json(await goalProgress(userId, { today: todayInJakarta(), includeArchived }));
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = goalCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await createGoal(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("nameTaken" in result) return goalNameTaken();
  return Response.json(result, { status: 201 });
});
