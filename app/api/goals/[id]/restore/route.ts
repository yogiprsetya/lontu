import { goalNotFound, goalRestoreConflict } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { restoreGoal } from "@/lib/server/goals";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const result = await restoreGoal(userId, params.id);
  if ("notFound" in result) return goalNotFound();
  if ("restoreConflict" in result) return goalRestoreConflict();
  return Response.json(result);
});
