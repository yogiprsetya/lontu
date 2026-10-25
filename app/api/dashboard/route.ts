import { badRequest } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { todayInJakarta } from "@/lib/date";
import { dashboardQuerySchema } from "@/lib/schemas/dashboard";
import { dashboardSummary } from "@/lib/server/queries/dashboard-summary";

export const GET = withAuth(async (req, { userId }) => {
  const parsed = dashboardQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);

  return Response.json(await dashboardSummary(userId, parsed.data.period, todayInJakarta()));
});
