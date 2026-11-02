import { badRequest, fieldError, goalNameTaken, goalNotFound, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { goalUpdateSchema } from "@/lib/schemas/goal";
import { archiveGoal, updateGoal } from "@/lib/server/goals";

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = goalUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await updateGoal(userId, params.id, parsed.data);
  if ("notFound" in result) return goalNotFound();
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("nameTaken" in result) return goalNameTaken();
  return Response.json(result);
});

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const result = await archiveGoal(userId, params.id);
  return "notFound" in result ? goalNotFound() : Response.json(result);
});
