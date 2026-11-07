import { netWorthNotFound, netWorthRestoreConflict } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { restoreNetWorth } from "@/lib/server/net-worth";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const result = await restoreNetWorth(userId, params.id);
  if ("notFound" in result) return netWorthNotFound();
  if ("restoreConflict" in result) return netWorthRestoreConflict();
  return Response.json(result);
});
