import { accountNotFound, badRequest } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { todayInJakarta } from "@/lib/date";
import { assetHistoryQuerySchema } from "@/lib/schemas/asset-history";
import { assetHistory } from "@/lib/server/queries/asset-history";

export const GET = withAuth(async (req, { userId }) => {
  const parsed = assetHistoryQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) return badRequest(parsed.error);

  const { range, accountId = null } = parsed.data;
  const history = await assetHistory(userId, { range, accountId, today: todayInJakarta() });
  return history ? Response.json(history) : accountNotFound();
});
